"""
Generative analysis layer.
Produces a rich, paragraph-style AI narrative from structured prediction data.
Rule-based generation — no external LLM API required.
"""

import random

# ── Sentence banks ────────────────────────────────────────────────────────────

_FRESHNESS_FRESH = [
    "Visual inspection by the CNN model confirms the crop is in excellent condition with no signs of spoilage.",
    "The image analysis indicates strong structural integrity and healthy coloration, consistent with market-ready produce.",
    "CNN classification places this crop firmly in the Fresh category, suggesting it is suitable for immediate market dispatch.",
]

_FRESHNESS_ROTTEN = [
    "The CNN model detected visible degradation patterns in the image, classifying the crop as Rotten.",
    "Image analysis reveals surface deterioration and discoloration consistent with post-harvest spoilage.",
    "The crop shows signs of quality loss that would likely result in rejection at most mandis.",
]

_PRICE_HIGH = [
    "Current market data indicates elevated price levels, suggesting strong buyer demand in the region.",
    "Live price signals show the market is trading above seasonal averages, creating a favorable selling window.",
    "Price spread analysis reveals high market activity with buyers willing to pay premium rates.",
]

_PRICE_MODERATE = [
    "Market prices are within normal seasonal ranges, reflecting balanced supply and demand conditions.",
    "Current price data suggests a stable market environment with moderate trading activity.",
    "Price levels indicate a neutral market phase — neither a strong buyer's nor seller's market.",
]

_PRICE_LOW = [
    "Market prices are currently subdued, indicating weak demand or oversupply in the region.",
    "Price data suggests cautious buyer sentiment, which may compress realized selling prices.",
    "Current market conditions show limited price momentum — holding may be the lower-risk strategy.",
]

_SELL_ACTION = [
    "Given the crop quality and market conditions, selling now is the recommended course of action.",
    "The combination of fresh produce and favorable pricing creates an optimal selling opportunity.",
    "All signals align for a sell decision — quality is high and market timing is favorable.",
]

_HOLD_ACTION = [
    "Despite good crop quality, current market conditions suggest waiting for a stronger price window.",
    "Holding the crop while monitoring price trends could yield better returns in the near term.",
    "Market signals are mixed — preserving the crop until demand strengthens is the prudent approach.",
]

_DO_NOT_SELL_ACTION = [
    "Selling this crop in its current condition is not advisable — quality issues will likely result in price penalties or outright rejection.",
    "The crop's degraded state makes it unsuitable for standard market channels. Consider alternative uses or disposal.",
    "Market entry with rotten produce risks reputational damage and financial loss. Do not sell.",
]

_CONFIDENCE_HIGH = "The model's confidence level is high, indicating a reliable classification."
_CONFIDENCE_MED  = "The model's confidence is moderate — the result is likely correct but warrants a manual quality check."
_CONFIDENCE_LOW  = "Confidence is below typical thresholds — consider re-scanning with a clearer image."

_SOURCE_WEB   = "Price estimates were sourced from live market data via web search."
_SOURCE_LOCAL = "Price estimates are based on historical dataset medians for this crop category."


def _pick(bank: list[str]) -> str:
    return random.choice(bank)


def generate_analysis(
    freshness: str,
    confidence: float,
    recommendation: str,
    min_price: float,
    max_price: float,
    market_insight: str,
    price_source: str,
    crop_hint: str = "",
) -> str:
    """
    Compose a multi-sentence AI-style analysis paragraph from structured inputs.
    """
    parts = []

    # 1. Freshness sentence
    parts.append(_pick(_FRESHNESS_FRESH if freshness == "Fresh" else _FRESHNESS_ROTTEN))

    # 2. Confidence qualifier
    if confidence >= 0.80:
        parts.append(_CONFIDENCE_HIGH)
    elif confidence >= 0.60:
        parts.append(_CONFIDENCE_MED)
    else:
        parts.append(_CONFIDENCE_LOW)

    # 3. Price context
    spread_ratio = (max_price - min_price) / ((min_price + max_price) / 2) if (min_price + max_price) > 0 else 0
    avg_price = (min_price + max_price) / 2
    if avg_price >= 4000:
        parts.append(_pick(_PRICE_HIGH))
    elif avg_price >= 2000:
        parts.append(_pick(_PRICE_MODERATE))
    else:
        parts.append(_pick(_PRICE_LOW))

    # 4. Price source note
    parts.append(_SOURCE_WEB if price_source == "web_search" else _SOURCE_LOCAL)

    # 5. Market insight (from intelligence.py)
    parts.append(market_insight)

    # 6. Action recommendation
    if recommendation == "SELL":
        parts.append(_pick(_SELL_ACTION))
    elif recommendation == "HOLD":
        parts.append(_pick(_HOLD_ACTION))
    else:
        parts.append(_pick(_DO_NOT_SELL_ACTION))

    # 7. Estimated price range
    parts.append(
        f"Estimated market price range for this crop: INR {min_price:,.0f} – INR {max_price:,.0f} per quintal."
    )

    return " ".join(parts)
