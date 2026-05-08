from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from tensorflow import keras  # type: ignore

from config import settings
from intelligence import enrich
from logger import get_logger
from ml_pipeline import CATEGORICAL_COLUMNS, FEATURE_COLUMNS, LABELS, NUMERIC_COLUMNS

log = get_logger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
MANIFEST_PATH = MODELS_DIR / "artifact_manifest.json"

MODEL_LABELS = {index: label for index, label in enumerate(LABELS)}

_lock = threading.RLock()
_manifest: dict[str, Any] = {}
_metadata: dict[str, Any] = {}
_metrics: dict[str, Any] = {}
_registry: dict[str, "ModelEntry"] = {}
_scaler = None
_encoder = None
_feature_columns: list[str] = []
_kmeans = None


@dataclass
class ModelEntry:
    model: object
    version: str
    kind: str
    loaded_at: float = field(default_factory=time.time)


def _file_version(path: Path) -> str:
    return str(int(path.stat().st_mtime))


def _load_keras_model(path: Path):
    return keras.models.load_model(path, compile=False)


def _load_json(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def load_artifacts() -> None:
    global _manifest, _metadata, _metrics, _scaler, _encoder, _feature_columns, _kmeans

    if not MANIFEST_PATH.exists():
        raise RuntimeError("artifact_manifest.json not found. Run backend/train_models.py first.")

    with _lock:
        _manifest = _load_json(MANIFEST_PATH)
        preprocessing = _manifest["preprocessing"]

        _encoder = joblib.load(MODELS_DIR / preprocessing["encoder_path"])
        _scaler = joblib.load(MODELS_DIR / preprocessing["scaler_path"])
        _feature_columns = list(joblib.load(MODELS_DIR / preprocessing["feature_columns_path"]))
        _kmeans = joblib.load(MODELS_DIR / _manifest["kmeans"]["path"])
        _metadata = _load_json(MODELS_DIR / _manifest["metadata_path"])
        _metrics = _load_json(MODELS_DIR / _manifest["metrics_path"])
        _registry.clear()

        for model_key, model_info in _manifest["models"].items():
            path = MODELS_DIR / model_info["path"]
            model = _load_keras_model(path) if model_info["kind"] == "keras" else joblib.load(path)
            _registry[model_key] = ModelEntry(
                model=model,
                version=_manifest["timestamp"],
                kind=model_info["kind"],
            )

        log.info(
            "Artifact loading complete",
            extra={"models": list(_registry.keys()), "manifest_timestamp": _manifest["timestamp"]},
        )


def _resolve(model_type: str) -> str:
    key = _manifest.get("default_model", "random_forest") if model_type == "best" else model_type
    if key not in _registry:
        raise ValueError(f"Model '{model_type}' is not available. Available: {list(_registry.keys())}")
    return key


def _encoder_categories(column: str) -> list[str]:
    index = CATEGORICAL_COLUMNS.index(column)
    return [str(item) for item in _encoder.categories_[index]]


def _safe_encode(column: str, value: str | None, fallback: str | None = None) -> tuple[int, str]:
    categories = _encoder_categories(column)
    candidates = [value, fallback]

    for candidate in candidates:
        if not candidate:
            continue
        exact = next((item for item in categories if item.lower() == candidate.lower()), None)
        if exact is not None:
            return categories.index(exact), exact
        partial = next((item for item in categories if candidate.lower() in item.lower()), None)
        if partial is not None:
            return categories.index(partial), partial

    chosen = categories[0]
    return categories.index(chosen), chosen


def _resolve_commodity(crop_hint: str) -> tuple[int, str]:
    hint = crop_hint.strip() if crop_hint else ""
    return _safe_encode("commodity", hint, "Apple")


def build_feature_context(
    min_price: float,
    max_price: float,
    crop_hint: str = "",
    state: str | None = None,
    district: str | None = None,
    market: str | None = None,
    variety: str | None = None,
    grade: str | None = None,
    arrival_date: str | None = None,
) -> dict[str, Any]:
    commodity_encoded, commodity_name = _resolve_commodity(crop_hint)
    state_encoded, state_name = _safe_encode("state", state, settings.default_state)
    district_encoded, district_name = _safe_encode("district", district, settings.default_district)
    market_encoded, market_name = _safe_encode("market", market, settings.default_market)
    variety_encoded, variety_name = _safe_encode("variety", variety or crop_hint, commodity_name)
    grade_encoded, grade_name = _safe_encode("grade", grade, settings.default_grade)
    arrival_date_encoded, arrival_date_name = _safe_encode("arrival_date", arrival_date, None)

    return {
        "min_price": float(min_price),
        "max_price": float(max_price),
        "state_encoded": state_encoded,
        "district_encoded": district_encoded,
        "market_encoded": market_encoded,
        "commodity_encoded": commodity_encoded,
        "variety_encoded": variety_encoded,
        "grade_encoded": grade_encoded,
        "arrival_date_encoded": arrival_date_encoded,
        "state": state_name,
        "district": district_name,
        "market": market_name,
        "commodity": commodity_name,
        "variety": variety_name,
        "grade": grade_name,
        "arrival_date": arrival_date_name,
    }


def _feature_array(feature_context: dict[str, Any]) -> np.ndarray:
    return np.array([[feature_context[column] for column in _feature_columns]], dtype=np.float32)


def _predict_probabilities(entry: ModelEntry, scaled_features: np.ndarray) -> tuple[int, np.ndarray]:
    if entry.kind == "keras":
        probs = entry.model.predict(scaled_features, verbose=0)[0]
    else:
        probs = entry.model.predict_proba(scaled_features)[0]
    prediction_code = int(np.argmax(probs))
    return prediction_code, np.asarray(probs, dtype=np.float32)


def _feature_contributions(feature_context: dict[str, Any], probabilities: np.ndarray, prediction_label: str) -> list[dict[str, Any]]:
    high_conf = float(probabilities[2]) if len(probabilities) > 2 else 0.0
    low_conf = float(probabilities[0]) if len(probabilities) > 0 else 0.0
    price_spread = feature_context["max_price"] - feature_context["min_price"]
    mid_price = (feature_context["min_price"] + feature_context["max_price"]) / 2
    contributions = [
        {
            "feature": "Price Range",
            "value": f"INR {feature_context['min_price']:,.0f} - {feature_context['max_price']:,.0f}",
            "impact": round(min(price_spread / max(mid_price, 1), 1.0), 3),
            "direction": "positive" if prediction_label == "High" else "negative" if prediction_label == "Low" else "neutral",
            "explanation": "Spread between min and max price is one of the strongest short-term market signals.",
        },
        {
            "feature": "Commodity",
            "value": feature_context["commodity"],
            "impact": round(high_conf * 0.6, 3),
            "direction": "positive" if prediction_label == "High" else "neutral",
            "explanation": "Commodity identity anchors class priors learned during training.",
        },
        {
            "feature": "Market Location",
            "value": f"{feature_context['market']}, {feature_context['district']}, {feature_context['state']}",
            "impact": round((1 - low_conf) * 0.45, 3),
            "direction": "positive" if prediction_label != "Low" else "negative",
            "explanation": "Regional market context influences local supply-demand behavior.",
        },
    ]
    contributions.sort(key=lambda item: item["impact"], reverse=True)
    return contributions


def _recommendation_from_label(prediction_label: str, confidence: float) -> str:
    if prediction_label == "High":
        return "SELL"
    if prediction_label == "Medium" and confidence >= 0.75:
        return "SELL"
    return "HOLD"


def cluster_features(scaled_features: np.ndarray) -> dict[str, Any]:
    try:
        cluster_id = int(_kmeans.predict(scaled_features)[0])
        distance = float(_kmeans.transform(scaled_features)[0][cluster_id])
        return {"cluster_id": cluster_id, "cluster_distance": round(distance, 4), "cluster_error": None}
    except Exception as exc:
        log.warning("KMeans clustering unavailable for this runtime", extra={"error": str(exc)})
        return {"cluster_id": -1, "cluster_distance": -1.0, "cluster_error": str(exc)}


def predict(
    min_price: float,
    max_price: float,
    model_type: str = "best",
    crop_hint: str = "",
    state: str | None = None,
    district: str | None = None,
    market: str | None = None,
    variety: str | None = None,
    grade: str | None = None,
    arrival_date: str | None = None,
) -> dict[str, Any]:
    t0 = time.perf_counter()

    with _lock:
        if _scaler is None or _encoder is None or not _feature_columns or not _registry:
            raise RuntimeError("Artifacts not loaded.")
        if min_price > max_price:
            raise ValueError("min_price must be <= max_price.")
        resolved = _resolve(model_type)
        entry = _registry[resolved]

    feature_context = build_feature_context(
        min_price=min_price,
        max_price=max_price,
        crop_hint=crop_hint,
        state=state,
        district=district,
        market=market,
        variety=variety,
        grade=grade,
        arrival_date=arrival_date,
    )
    features = _feature_array(feature_context)
    scaled = _scaler.transform(features).astype(np.float32)
    prediction_code, probabilities = _predict_probabilities(entry, scaled)
    prediction_label = MODEL_LABELS[prediction_code]
    intelligence = enrich(entry.model, scaled, prediction_code, prediction_label, min_price, max_price)
    recommendation = _recommendation_from_label(prediction_label, intelligence["confidence"])
    cluster_info = cluster_features(scaled)

    probability_map = {
        MODEL_LABELS[index]: round(float(probabilities[index]), 4)
        for index in range(min(len(probabilities), len(MODEL_LABELS)))
    }
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "model_used": resolved,
        "model_version": entry.version,
        "prediction": prediction_code,
        "prediction_label": prediction_label,
        "recommendation": recommendation,
        "confidence": intelligence["confidence"],
        "probabilities": probability_map,
        "price_range_analysis": intelligence["price_range_analysis"],
        "market_insight": intelligence["market_insight"],
        "cluster_id": cluster_info["cluster_id"],
        "cluster_distance": cluster_info["cluster_distance"],
        "cluster_error": cluster_info.get("cluster_error"),
        "feature_context": {
            "state": feature_context["state"],
            "district": feature_context["district"],
            "market": feature_context["market"],
            "commodity": feature_context["commodity"],
            "variety": feature_context["variety"],
            "grade": feature_context["grade"],
            "arrival_date": feature_context["arrival_date"],
        },
        "feature_contributions": _feature_contributions(feature_context, probabilities, prediction_label),
        "latency_ms": latency_ms,
    }


def registry_info() -> list[dict[str, Any]]:
    with _lock:
        return [
            {
                "model": key,
                "version": value.version,
                "kind": value.kind,
                "loaded_at": value.loaded_at,
            }
            for key, value in _registry.items()
        ]


def get_model_metrics() -> list[dict[str, Any]]:
    rows = []
    for model_key, payload in _metrics.items():
        rows.append(
            {
                "model": model_key,
                "accuracy": payload.get("classification_report", {}).get("accuracy"),
                "macro_f1": payload.get("macro_f1"),
                "weighted_f1": payload.get("weighted_f1"),
                "cv_accuracy_mean": payload.get("cv_accuracy_mean"),
                "cv_accuracy_std": payload.get("cv_accuracy_std"),
                "cv_f1_macro_mean": payload.get("cv_f1_macro_mean"),
                "cv_precision_macro_mean": payload.get("cv_precision_macro_mean"),
                "cv_recall_macro_mean": payload.get("cv_recall_macro_mean"),
                "confusion_matrix": payload.get("confusion_matrix"),
                "classification_report": payload.get("classification_report"),
                "learning_curve": payload.get("learning_curve"),
                "validation_curve": payload.get("validation_curve"),
                "history": payload.get("history"),
                "best_epoch": payload.get("best_epoch"),
                "model_type": payload.get("model_type"),
            }
        )
    return rows


def get_cluster_sample(n_samples: int = 120) -> dict[str, Any]:
    if _kmeans is None or _encoder is None or _scaler is None:
        return {"clusters": [], "k": 0, "silhouette_score": 0.0, "note": "KMeans model not loaded."}

    rng = np.random.default_rng(42)
    state_categories = _encoder_categories("state")
    commodity_categories = _encoder_categories("commodity")
    district_categories = _encoder_categories("district")
    market_categories = _encoder_categories("market")
    variety_categories = _encoder_categories("variety")
    grade_categories = _encoder_categories("grade")
    date_categories = _encoder_categories("arrival_date")

    rows = []
    points = []
    for index in range(n_samples):
        min_price = float(rng.uniform(500, 8000))
        max_price = float(min_price + rng.uniform(200, 3000))
        feature_context = {
            "min_price": min_price,
            "max_price": max_price,
            "state_encoded": index % len(state_categories),
            "district_encoded": 0,
            "market_encoded": 0,
            "commodity_encoded": index % len(commodity_categories),
            "variety_encoded": 0,
            "grade_encoded": 0,
            "arrival_date_encoded": 0,
        }
        rows.append([feature_context[column] for column in FEATURE_COLUMNS])
        points.append(
            {
                "min_price": round(min_price, 2),
                "max_price": round(max_price, 2),
                "modal_price": round((min_price + max_price) / 2, 2),
                "commodity": commodity_categories[index % len(commodity_categories)],
                "state": state_categories[index % len(state_categories)],
            }
        )

    scaled = _scaler.transform(np.asarray(rows, dtype=np.float32)).astype(np.float32)
    cluster_ids = _kmeans.predict(scaled)
    for index, cluster_id in enumerate(cluster_ids):
        points[index]["cluster_id"] = int(cluster_id)

    return {
        "clusters": points,
        "k": int(_kmeans.n_clusters),
        "silhouette_score": 0.0,
        "note": "Cluster assignments generated from the production preprocessing pipeline.",
    }
