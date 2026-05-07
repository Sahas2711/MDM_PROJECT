"""
Rule-based crop recommendation using dataset statistics.
No retraining — derives recommendations from precomputed dataset medians.
"""

import pandas as pd
from pathlib import Path
from functools import lru_cache

DATA_PATH = Path(__file__).parent.parent / "dataset" / "crop_prices.csv"

SEASON_CROPS = {
    "kharif":  ["Rice", "Maize", "Cotton", "Soybean", "Groundnut"],
    "rabi":    ["Wheat", "Mustard", "Gram", "Barley", "Peas"],
    "zaid":    ["Watermelon", "Muskmelon", "Cucumber", "Moong"],
    "all":     ["Tomato", "Onion", "Potato", "Banana", "Apple", "Mango"],
}

SOIL_CROPS = {
    "alluvial":  ["Wheat", "Rice", "Sugarcane", "Cotton"],
    "black":     ["Cotton", "Soybean", "Groundnut", "Wheat"],
    "red":       ["Groundnut", "Maize", "Pulses", "Millets"],
    "laterite":  ["Cashew", "Coconut", "Tea", "Coffee"],
    "sandy":     ["Watermelon", "Groundnut", "Carrot", "Potato"],
    "loamy":     ["Wheat", "Maize", "Vegetables", "Fruits"],
}

BUDGET_TIERS = {
    "low":    (0,     10000),
    "medium": (10000, 50000),
    "high":   (50000, 999999),
}


@lru_cache(maxsize=1)
def _load_stats() -> dict:
    """Load dataset once and compute per-commodity stats."""
    try:
        df = pd.read_csv(DATA_PATH)
        df.columns = [c.lower().strip() for c in df.columns]
        stats = {}
        for commodity, group in df.groupby("commodity"):
            stats[commodity.lower()] = {
                "name": commodity,
                "median_min": round(group["min_price"].median(), 2),
                "median_max": round(group["max_price"].median(), 2),
                "median_modal": round(group["modal_price"].median(), 2),
                "count": len(group),
            }
        return stats
    except Exception:
        return {}


def recommend(season: str, budget: int, soil_type: str) -> dict:
    stats = _load_stats()
    season_key = season.lower().strip()
    soil_key   = soil_type.lower().strip()

    # Candidate crops from season + soil intersection
    season_list = SEASON_CROPS.get(season_key, SEASON_CROPS["all"])
    soil_list   = SOIL_CROPS.get(soil_key, [])
    candidates  = [c for c in season_list if c in soil_list] or season_list

    # Budget filter — use dataset median_min as proxy for input cost
    budget_min, budget_max = BUDGET_TIERS.get(
        "low" if budget < 10000 else "medium" if budget < 50000 else "high",
        (0, 999999),
    )

    results = []
    for crop_name in candidates:
        key = crop_name.lower()
        s = stats.get(key)
        if s is None:
            # No dataset entry — use generic estimate
            s = {"name": crop_name, "median_min": 1500.0, "median_max": 3000.0,
                 "median_modal": 2000.0, "count": 0}

        # Simple risk: high spread = volatile = higher risk
        spread_ratio = (s["median_max"] - s["median_min"]) / max(s["median_modal"], 1)
        risk = "High" if spread_ratio > 0.4 else "Medium" if spread_ratio > 0.2 else "Low"

        results.append({
            "crop": s["name"],
            "expected_min_price": s["median_min"],
            "expected_max_price": s["median_max"],
            "expected_modal_price": s["median_modal"],
            "risk_level": risk,
            "data_points": s["count"],
            "reason": (
                f"{s['name']} is suitable for {season_key} season on {soil_key} soil. "
                f"Historical modal price: INR {s['median_modal']:,.0f}/quintal."
            ),
        })

    # Sort by modal price descending (highest return first)
    results.sort(key=lambda x: x["expected_modal_price"], reverse=True)

    return {
        "season": season_key,
        "soil_type": soil_key,
        "budget": budget,
        "recommendations": results[:5],
        "note": "Based on historical dataset medians. Actual prices vary by market and timing.",
    }
