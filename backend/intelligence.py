"""
Derives confidence, price range analysis, and market insight from model output.
"""

import numpy as np


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


def get_confidence(
    model,
    scaled_features: np.ndarray,
    prediction: int,
    min_price: float,
    max_price: float,
) -> float:
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(scaled_features)[0]
        return round(float(proba[prediction]), 4)

    tier = _spread_tier(min_price, max_price)
    heuristic = {
        "tight": 0.66,
        "moderate": 0.74,
        "wide": 0.82,
        "very_wide": 0.88,
    }
    return heuristic[tier]


_RANGE_MESSAGES: dict[str, str] = {
    "tight": "Tight price spread suggests a stable market with limited short-term upside.",
    "moderate": "Moderate price spread reflects a balanced market with some room for improvement.",
    "wide": "Wide price spread indicates active trading and stronger separation between weaker and stronger bids.",
    "very_wide": "Very wide price spread suggests volatility, so quality and timing matter a lot.",
}


def get_price_range_analysis(min_price: float, max_price: float) -> str:
    return _RANGE_MESSAGES[_spread_tier(min_price, max_price)]


_INSIGHT_MAP: dict[tuple[str, str], str] = {
    ("High", "tight"): "Prices are already strong and stable, so selling now can lock in a dependable return.",
    ("High", "moderate"): "The crop sits in a favorable price band with healthy demand, which supports selling soon.",
    ("High", "wide"): "Wide upside and strong pricing suggest buyers are active, making this a good sell window.",
    ("High", "very_wide"): "The market is paying premium prices, but volatility is high, so timely selling matters.",
    ("Medium", "tight"): "The market is steady but not yet strongly rewarding, so a short hold may improve returns.",
    ("Medium", "moderate"): "Prices are balanced, which supports a cautious hold while watching for stronger buyer demand.",
    ("Medium", "wide"): "The range is active, but direction is still mixed, so careful monitoring is better than rushing.",
    ("Medium", "very_wide"): "The market is moving sharply without clear direction, which makes a short hold safer than a rushed sale.",
    ("Low", "tight"): "Prices are weak and stable, so selling now may limit returns and holding is usually safer.",
    ("Low", "moderate"): "The market is not rewarding sellers enough yet, so holding is the lower-risk option.",
    ("Low", "wide"): "Even with a wider range, the price class is still low, which suggests patience over immediate selling.",
    ("Low", "very_wide"): "Low-class pricing plus volatility creates downside risk, so holding is better than selling immediately.",
}


def get_market_insight(prediction_label: str, min_price: float, max_price: float) -> str:
    tier = _spread_tier(min_price, max_price)
    return _INSIGHT_MAP[(prediction_label, tier)]


def enrich(
    model,
    scaled_features: np.ndarray,
    prediction: int,
    prediction_label: str,
    min_price: float,
    max_price: float,
) -> dict:
    return {
        "confidence": get_confidence(model, scaled_features, prediction, min_price, max_price),
        "price_range_analysis": get_price_range_analysis(min_price, max_price),
        "market_insight": get_market_insight(prediction_label, min_price, max_price),
    }
