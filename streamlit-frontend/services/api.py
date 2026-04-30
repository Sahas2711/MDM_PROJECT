from __future__ import annotations

import os
from typing import Any

import requests
import streamlit as st


BASE_URL = os.getenv("STREAMLIT_API_BASE_URL", "http://127.0.0.1:8000")


@st.cache_data(ttl=30, show_spinner=False)
def get_health() -> dict[str, Any] | None:
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=3)
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None


def predict_crop_price(min_price: float, max_price: float, model_type: str) -> dict[str, Any]:
    try:
        response = requests.post(
            f"{BASE_URL}/predict",
            params={"model_type": model_type},
            json={"min_price": min_price, "max_price": max_price},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.HTTPError:
        detail = "Prediction request failed."
        try:
            payload = response.json()
            detail = payload.get("detail", detail)
        except ValueError:
            pass
        return {"error": detail}
    except requests.RequestException:
        return {"error": f"Could not connect to the backend at {BASE_URL}."}
