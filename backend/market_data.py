"""
Fetches live crop market price estimates via DuckDuckGo Instant Answer API.
No API key required. Falls back to dataset median if fetch fails.
"""

import re
import httpx
from logger import get_logger

log = get_logger(__name__)

# Dataset-derived fallback medians (INR/quintal) per crop keyword
_FALLBACK_PRICES: dict[str, tuple[float, float]] = {
    "default": (2500.0, 4500.0),
    "wheat":   (2100.0, 2800.0),
    "rice":    (1800.0, 2600.0),
    "maize":   (1500.0, 2200.0),
    "tomato":  (800.0,  2000.0),
    "onion":   (600.0,  1800.0),
    "potato":  (700.0,  1500.0),
    "apple":   (3000.0, 6000.0),
    "mango":   (2000.0, 5000.0),
    "banana":  (800.0,  1800.0),
    "grapes":  (2500.0, 5500.0),
    "orange":  (1500.0, 3500.0),
}

_DDG_URL = "https://api.duckduckgo.com/"


def _extract_prices_from_text(text: str) -> tuple[float, float] | None:
    """Try to pull two INR price figures from a text snippet."""
    # Match patterns like ₹1200, Rs 1500, INR 2000, 1200 per quintal
    nums = re.findall(r'(?:₹|rs\.?|inr)?\s*(\d[\d,]*)', text.lower())
    values = []
    for n in nums:
        try:
            v = float(n.replace(',', ''))
            if 100 <= v <= 200_000:   # plausible INR crop price
                values.append(v)
        except ValueError:
            pass
    if len(values) >= 2:
        return min(values), max(values)
    if len(values) == 1:
        v = values[0]
        return v * 0.85, v * 1.15
    return None


def _keyword_from_class(freshness_class: str, crop_hint: str = "") -> str:
    hint = crop_hint.lower().strip() if crop_hint else ""
    for key in _FALLBACK_PRICES:
        if key in hint:
            return key
    return "default"


async def fetch_market_prices(crop_hint: str = "") -> dict:
    """
    Returns {"min_price": float, "max_price": float, "source": str}
    Tries DuckDuckGo first, falls back to dataset medians.
    """
    query = f"{crop_hint} crop price per quintal India today" if crop_hint else "crop price India today INR quintal"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(_DDG_URL, params={
                "q": query, "format": "json", "no_html": "1", "skip_disambig": "1"
            })
            if resp.status_code == 200:
                data = resp.json()
                # Try Abstract, Answer, then first RelatedTopic
                texts = [
                    data.get("Abstract", ""),
                    data.get("Answer", ""),
                    *[t.get("Text", "") for t in data.get("RelatedTopics", [])[:3]],
                ]
                for text in texts:
                    if text:
                        prices = _extract_prices_from_text(text)
                        if prices:
                            log.info("Market prices from web", extra={"query": query, "prices": prices})
                            return {"min_price": prices[0], "max_price": prices[1], "source": "web_search"}
    except Exception as exc:
        log.warning("Web price fetch failed, using fallback", extra={"error": str(exc)})

    key = _keyword_from_class("", crop_hint)
    fallback = _FALLBACK_PRICES.get(key, _FALLBACK_PRICES["default"])
    log.info("Using fallback prices", extra={"key": key, "prices": fallback})
    return {"min_price": fallback[0], "max_price": fallback[1], "source": "dataset_median"}
