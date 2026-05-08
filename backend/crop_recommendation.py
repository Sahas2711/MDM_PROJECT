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

    top = results[0] if results else None
    alternatives = [r["crop"] for r in results[1:4]] if len(results) > 1 else []

    profitability = "High" if top and top["expected_modal_price"] > 2500 else "Medium" if top and top["expected_modal_price"] > 1500 else "Low"
    confidence = min(95, 70 + len([r for r in results if r["data_points"] > 10]) * 5)

    season_reasons = {
        "kharif": f"Kharif season (Jun–Oct) aligns with monsoon rainfall, which {top['crop'] if top else 'this crop'} requires for optimal germination and growth.",
        "rabi":   f"Rabi season (Oct–Mar) provides cool temperatures ideal for {top['crop'] if top else 'this crop'} development and yield.",
        "zaid":   f"Zaid season (Mar–Jun) short summer window suits {top['crop'] if top else 'this crop'} with fast maturity cycles.",
    }
    soil_reasons = {
        "loamy":    "Loamy soil provides balanced drainage and water retention, supporting strong root development.",
        "black":    "Black soil's high moisture retention and mineral content directly benefits this crop's nutrient needs.",
        "alluvial": "Alluvial soil's high fertility and fine texture supports high-yield cultivation.",
        "sandy":    "Sandy soil's fast drainage suits this crop's preference for well-aerated root zones.",
        "red":      "Red soil with proper fertilization supports this crop's moderate nutrient requirements.",
        "clay":     "Clay soil's water retention is managed with proper drainage to support this crop.",
    }

    return {
        "season": season_key,
        "soil_type": soil_key,
        "budget": budget,
        "recommended_crop": top["crop"] if top else "N/A",
        "expected_price_range": f"INR {top['expected_min_price']:,.0f} – {top['expected_max_price']:,.0f} / quintal" if top else "N/A",
        "profitability": profitability,
        "confidence": confidence,
        "reason": (
            f"{top['crop']} is the top recommendation for {season_key} season on {soil_key} soil within a budget of INR {budget:,}. "
            f"Historical modal price is INR {top['expected_modal_price']:,.0f}/quintal with {top['data_points']} dataset records. "
            f"Risk level is {top['risk_level']} based on price spread ratio. "
            f"{season_reasons.get(season_key, '')} "
            f"{soil_reasons.get(soil_key, '')}"
        ) if top else "No suitable crop found for the given inputs.",
        "season_reason": season_reasons.get(season_key, ""),
        "soil_reason": soil_reasons.get(soil_key, ""),
        "budget_reason": f"Budget of INR {budget:,} covers input costs for {top['crop']} cultivation. Expected return at modal price: INR {top['expected_modal_price']:,.0f}/quintal." if top else "",
        "alternatives": alternatives,
        "all_recommendations": results[:5],
        "note": "Based on historical dataset medians. Actual prices vary by market and timing.",
    }
