from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import streamlit as st
from tensorflow import keras  # type: ignore


MODELS_DIR = Path(__file__).resolve().parents[2] / "backend" / "models"
MANIFEST_PATH = MODELS_DIR / "artifact_manifest.json"
LABELS = ["Low", "Medium", "High"]


@st.cache_resource(show_spinner=False)
def load_local_artifacts() -> dict[str, Any]:
    with open(MANIFEST_PATH, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    preprocessing = manifest["preprocessing"]
    scaler = joblib.load(MODELS_DIR / preprocessing["scaler_path"])
    model_info = manifest["models"][manifest["default_model"]]
    if model_info["kind"] == "keras":
        model = keras.models.load_model(MODELS_DIR / model_info["path"], compile=False)
    else:
        model = joblib.load(MODELS_DIR / model_info["path"])
    features = joblib.load(MODELS_DIR / preprocessing["feature_columns_path"])
    return {"manifest": manifest, "scaler": scaler, "model": model, "features": features}


def preprocess_features(min_price: float, max_price: float) -> np.ndarray:
    artifacts = load_local_artifacts()
    row = []
    for name in artifacts["features"]:
        if name == "min_price":
            row.append(min_price)
        elif name == "max_price":
            row.append(max_price)
        else:
            row.append(0.0)
    ordered = np.array([row], dtype=np.float32)
    return artifacts["scaler"].transform(ordered).astype(np.float32)


def predict_local_recommendation(min_price: float, max_price: float) -> dict[str, Any]:
    artifacts = load_local_artifacts()
    model = artifacts["model"]
    scaled = preprocess_features(min_price=min_price, max_price=max_price)

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(scaled)[0]
    else:
        probabilities = model.predict(scaled, verbose=0)[0]

    prediction = int(np.argmax(probabilities))
    confidence = float(probabilities[prediction])

    return {
        "prediction": prediction,
        "prediction_label": LABELS[prediction],
        "recommendation": "SELL" if LABELS[prediction] == "High" else "HOLD",
        "confidence": confidence,
        "features_used": artifacts["features"],
        "model_used": artifacts["manifest"]["default_model"],
    }
