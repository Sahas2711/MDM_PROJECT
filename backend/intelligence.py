"""
Derives confidence, price range analysis, and market insight from model output.

confidence  — from predict_proba when available, else a spread-based heuristic
price_range_analysis — characterises the min/max spread
market_insight — combines prediction + spread tier into an actionable sentence
"""

import numpy as np


# ── Spread tiers (fraction of mid-price) ─────────────────────────────────────
_SPREAD_THRESHOLDS = [
    (0.05, "tight"),
    (0.15, "moderate"),
    (0.30, "wide"),
]


def _spread_tier(min_price: float, max_price: float) -> str:
    mid = (min_price + max_price) / 2
    ratio = (max_price - min_price) / mid if mid else 0
    for threshold, label in _SPREAD_THRESHOLDS:
        if ratio <= threshold:
            return label
    return "very_wide"


# ── Confidence ────────────────────────────────────────────────────────────────
def get_confidence(
    model,
    scaled_features: np.ndarray,
    prediction: int,
    min_price: float,
    max_price: float,
) -> float:
    """
    Use predict_proba if the model supports it.
    Fall back to a spread-based heuristic so every model always returns a value.
    """
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(scaled_features)[0]
        return round(float(proba[prediction]), 4)

    # Heuristic: tighter spread → higher confidence in HOLD; wider → SELL
    tier = _spread_tier(min_price, max_price)
    heuristic = {
        "tight":     0.62 if prediction == 0 else 0.58,
        "moderate":  0.71 if prediction == 1 else 0.65,
        "wide":      0.82 if prediction == 1 else 0.60,
        "very_wide": 0.91 if prediction == 1 else 0.55,
    }
    return heuristic[tier]


# ── Price range analysis ──────────────────────────────────────────────────────
_RANGE_MESSAGES: dict[str, str] = {
    "tight":     "Tight price spread suggests stable, low-volatility market conditions.",
    "moderate":  "Moderate price spread reflects balanced supply and demand dynamics.",
    "wide":      "High price spread indicates strong demand and elevated market activity.",
    "very_wide": "Very high price spread signals significant volatility or supply disruption.",
}


def get_price_range_analysis(min_price: float, max_price: float) -> str:
    return _RANGE_MESSAGES[_spread_tier(min_price, max_price)]


# ── Market insight ────────────────────────────────────────────────────────────
_INSIGHT_MAP: dict[tuple[int, str], str] = {
    (1, "tight"):     "Market is stable — selling now locks in a reliable price.",
    (1, "moderate"):  "Favorable selling conditions with healthy demand activity.",
    (1, "wide"):      "Strong demand spread — favorable conditions for immediate selling.",
    (1, "very_wide"): "High volatility presents a premium selling opportunity; act promptly.",
    (0, "tight"):     "Low spread and weak momentum — holding is the lower-risk strategy.",
    (0, "moderate"):  "Mixed signals; holding until clearer demand emerges is advisable.",
    (0, "wide"):      "Wide spread but insufficient momentum — monitor before committing.",
    (0, "very_wide"): "Volatile market with uncertain direction — holding reduces downside risk.",
}


def get_market_insight(prediction: int, min_price: float, max_price: float) -> str:
    tier = _spread_tier(min_price, max_price)
    return _INSIGHT_MAP[(prediction, tier)]


# ── Single entry point ────────────────────────────────────────────────────────
def enrich(
    model,
    scaled_features: np.ndarray,
    prediction: int,
    min_price: float,
    max_price: float,
) -> dict:
    """Return all intelligence fields as a dict ready to merge into the response."""
    return {
        "confidence":           get_confidence(model, scaled_features, prediction, min_price, max_price),
        "price_range_analysis": get_price_range_analysis(min_price, max_price),
        "market_insight":       get_market_insight(prediction, min_price, max_price),
    }
