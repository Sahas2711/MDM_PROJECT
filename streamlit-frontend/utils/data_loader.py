from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st


DATASET_PATH = Path(__file__).resolve().parents[2] / "dataset" / "crop_prices.csv"


@st.cache_data(show_spinner=False)
def load_crop_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATASET_PATH)
    df["arrival_date"] = pd.to_datetime(df["arrival_date"], dayfirst=True, errors="coerce")
    df["arrival_month"] = df["arrival_date"].dt.strftime("%b")
    df["arrival_year"] = df["arrival_date"].dt.year
    df["price_spread"] = df["max_price"] - df["min_price"]
    return df
