"""
Fetches live crop market price estimates and preserves the reasoning used.
"""

import re

import httpx

from logger import get_logger

log = get_logger(__name__)

_FALLBACK_PRICES: dict[str, tuple[float, float]] = {
    "default": (2500.0, 4500.0),
    "wheat": (2100.0, 2800.0),
    "rice": (1800.0, 2600.0),
    "maize": (1500.0, 2200.0),
    "tomato": (800.0, 2000.0),
    "onion": (600.0, 1800.0),
    "potato": (700.0, 1500.0),
    "apple": (3000.0, 6000.0),
    "mango": (2000.0, 5000.0),
    "banana": (800.0, 1800.0),
    "grapes": (2500.0, 5500.0),
    "orange": (1500.0, 3500.0),
}

_DDG_URL = "https://api.duckduckgo.com/"


def _extract_prices_from_text(text: str) -> tuple[float, float] | None:
    nums = re.findall(r"(?:rs\.?|inr|₹)?\s*(\d[\d,]*)", text.lower())
    values = []
    for item in nums:
        try:
            value = float(item.replace(",", ""))
            if 100 <= value <= 200_000:
                values.append(value)
        except ValueError:
            pass

    if len(values) >= 2:
        return min(values), max(values)
    if len(values) == 1:
        return values[0] * 0.85, values[0] * 1.15
    return None


def _keyword_from_hint(crop_hint: str = "") -> str:
    hint = crop_hint.lower().strip()
    for key in _FALLBACK_PRICES:
        if key != "default" and key in hint:
            return key
    return "default"


async def fetch_market_prices(crop_hint: str = "") -> dict:
    keyword = _keyword_from_hint(crop_hint)
    query = f"{crop_hint} mandi price India today per quintal" if crop_hint else "fruit crop mandi price India today per quintal"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                _DDG_URL,
                params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"},
            )
            if resp.status_code == 200:
                data = resp.json()
                texts = [
                    data.get("Abstract", ""),
                    data.get("Answer", ""),
                    *[topic.get("Text", "") for topic in data.get("RelatedTopics", [])[:3] if isinstance(topic, dict)],
                ]
                for text in texts:
                    if not text:
                        continue
                    prices = _extract_prices_from_text(text)
                    if prices:
                        return {
                            "min_price": prices[0],
                            "max_price": prices[1],
                            "source": "web_search",
                            "query": query,
                            "matched_crop": keyword,
                            "source_reason": f"Live price estimates were extracted from web search text for the query '{query}'.",
                        }
    except Exception as exc:
        log.warning("Web price fetch failed, using fallback", extra={"error": str(exc), "query": query})

    fallback = _FALLBACK_PRICES.get(keyword, _FALLBACK_PRICES["default"])
    return {
        "min_price": fallback[0],
        "max_price": fallback[1],
        "source": "dataset_median",
        "query": query,
        "matched_crop": keyword,
        "source_reason": f"Live web prices were unavailable, so dataset-backed fallback prices for '{keyword}' were used.",
    }
