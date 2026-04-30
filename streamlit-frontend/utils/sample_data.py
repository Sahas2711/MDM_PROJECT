from __future__ import annotations

import pandas as pd


def get_analysis_dataframe() -> pd.DataFrame:
    records = [
        ("Jan", "Tomato", "Pune", 900, 1450, 1, "SELL", 0.82),
        ("Feb", "Tomato", "Nashik", 950, 1380, 1, "SELL", 0.78),
        ("Mar", "Onion", "Lasalgaon", 1100, 1500, 0, "HOLD", 0.63),
        ("Apr", "Onion", "Indore", 1080, 1410, 0, "HOLD", 0.61),
        ("May", "Potato", "Agra", 780, 1180, 1, "SELL", 0.75),
        ("Jun", "Potato", "Kanpur", 800, 1090, 0, "HOLD", 0.58),
        ("Jul", "Wheat", "Kota", 1600, 2050, 1, "SELL", 0.80),
        ("Aug", "Wheat", "Bhopal", 1580, 1980, 1, "SELL", 0.77),
        ("Sep", "Rice", "Raipur", 1700, 2100, 0, "HOLD", 0.66),
        ("Oct", "Rice", "Patna", 1750, 2250, 1, "SELL", 0.84),
        ("Nov", "Tomato", "Pune", 1020, 1490, 1, "SELL", 0.79),
        ("Dec", "Onion", "Lasalgaon", 1150, 1430, 0, "HOLD", 0.60),
    ]
    return pd.DataFrame(
        records,
        columns=["month", "crop", "market", "min_price", "max_price", "prediction", "recommendation", "confidence"],
    )


def get_dashboard_metrics() -> dict[str, int | float]:
    df = get_analysis_dataframe()
    avg_price = ((df["min_price"] + df["max_price"]) / 2).mean()
    sell_ratio = round((df["recommendation"].eq("SELL").mean()) * 100)
    return {
        "avg_price": avg_price,
        "sell_ratio": sell_ratio,
        "crop_count": df["crop"].nunique(),
        "dataset_count": len(df),
        "market_count": df["market"].nunique(),
    }
