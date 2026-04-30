from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import streamlit as st


MODELS_DIR = Path(__file__).resolve().parents[2] / "backend" / "models"


@st.cache_resource(show_spinner=False)
def load_local_artifacts() -> dict[str, Any]:
    scaler = joblib.load(MODELS_DIR / "scaler.pkl")
    model = joblib.load(MODELS_DIR / "crop_model.pkl")
    features = joblib.load(MODELS_DIR / "features.pkl")
    return {"scaler": scaler, "model": model, "features": features}


def preprocess_features(min_price: float, max_price: float) -> np.ndarray:
    artifacts = load_local_artifacts()
    features = artifacts["features"]
    payload = {"min_price": min_price, "max_price": max_price}
    ordered = np.array([[payload[name] for name in features]], dtype=float)
    return artifacts["scaler"].transform(ordered)


def predict_local_recommendation(min_price: float, max_price: float) -> dict[str, Any]:
    artifacts = load_local_artifacts()
    model = artifacts["model"]
    scaled = preprocess_features(min_price=min_price, max_price=max_price)
    prediction = int(model.predict(scaled)[0])

    confidence = None
    if hasattr(model, "predict_proba"):
        confidence = float(model.predict_proba(scaled)[0][prediction])

    return {
        "prediction": prediction,
        "recommendation": "SELL" if prediction == 1 else "HOLD",
        "confidence": confidence,
        "features_used": artifacts["features"],
    }
