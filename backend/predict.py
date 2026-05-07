import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import joblib
import numpy as np

from config import settings
from intelligence import enrich
from logger import get_logger

log = get_logger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
SCALER_PATH = MODELS_DIR / "feature_scaler.pkl"
LEGACY_SCALER_PATH = MODELS_DIR / "scaler.pkl"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.pkl"
LEGACY_FEATURE_COLUMNS_PATH = MODELS_DIR / "features.pkl"
LABEL_ENCODERS_PATH = MODELS_DIR / "label_encoders.pkl"
KMEANS_PATH = MODELS_DIR / "kmeans_clusterer.pkl"

MODEL_FILES: dict[str, str] = {
    "random_forest": "crop_price_classifier.pkl",
    "ann": "ann_model.h5",
    "dnn": "dnn_model.h5",
}

MODEL_LABELS = {0: "Low", 1: "Medium", 2: "High"}

_lock = threading.RLock()
_registry: dict[str, "ModelEntry"] = {}
_scaler = None
_feature_columns: list[str] = []
_label_encoders: dict[str, object] = {}
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
    from tensorflow import keras  # type: ignore

    return keras.models.load_model(path, compile=False)


def load_artifacts() -> None:
    global _scaler, _feature_columns, _label_encoders, _kmeans

    with _lock:
        scaler_path = SCALER_PATH if SCALER_PATH.exists() else LEGACY_SCALER_PATH
        feature_columns_path = FEATURE_COLUMNS_PATH if FEATURE_COLUMNS_PATH.exists() else LEGACY_FEATURE_COLUMNS_PATH

        log.info("Loading feature scaler", extra={"path": str(scaler_path)})
        _scaler = joblib.load(scaler_path)
        _feature_columns = list(joblib.load(feature_columns_path))
        _label_encoders = joblib.load(LABEL_ENCODERS_PATH)
        _kmeans = joblib.load(KMEANS_PATH) if KMEANS_PATH.exists() else None

        for model_type, filename in MODEL_FILES.items():
            path = MODELS_DIR / filename
            if not path.exists():
                log.warning("Model file not found, skipping", extra={"model": model_type, "file": filename})
                continue
            try:
                if path.suffix == ".h5":
                    model = _load_keras_model(path)
                    kind = "keras"
                else:
                    model = joblib.load(path)
                    kind = "sklearn"
                _registry[model_type] = ModelEntry(model=model, version=_file_version(path), kind=kind)
                log.info("Model loaded", extra={"model": model_type, "version": _registry[model_type].version})
            except Exception as exc:
                log.error("Failed to load model", extra={"model": model_type, "error": str(exc)})

        if "random_forest" not in _registry and (MODELS_DIR / "crop_model.pkl").exists():
            path = MODELS_DIR / "crop_model.pkl"
            model = joblib.load(path)
            _registry["random_forest"] = ModelEntry(model=model, version=_file_version(path), kind="sklearn")

        if not _registry:
            raise RuntimeError("No price models could be loaded. Cannot start.")

        log.info(
            "Artifact loading complete",
            extra={"models": list(_registry.keys()), "feature_count": len(_feature_columns), "has_kmeans": _kmeans is not None},
        )


def _resolve(model_type: str) -> str:
    key = settings.default_model if model_type == "best" else model_type
    if key not in _registry:
        raise ValueError(f"Model '{model_type}' is not available. Available: {list(_registry.keys())}")
    return key


def _safe_encode(column: str, value: str | None, fallback: str | None = None) -> tuple[int, str]:
    encoder = _label_encoders[column]
    classes = list(encoder.classes_)
    candidates = [value, fallback]

    for candidate in candidates:
        if not candidate:
            continue
        exact = next((item for item in classes if item.lower() == candidate.lower()), None)
        if exact is not None:
            return int(encoder.transform([exact])[0]), exact
        partial = next((item for item in classes if candidate.lower() in item.lower()), None)
        if partial is not None:
            return int(encoder.transform([partial])[0]), partial

    chosen = classes[0]
    return int(encoder.transform([chosen])[0]), chosen


def _resolve_commodity(crop_hint: str) -> tuple[int, str]:
    hint = crop_hint.strip()
    if not hint:
        hint = "Apple"
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
) -> dict:
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


def _feature_array(feature_context: dict) -> np.ndarray:
    feature_values = [feature_context[column] for column in _feature_columns]
    return np.array([feature_values], dtype=np.float32)


def _predict_probabilities(entry: ModelEntry, scaled_features: np.ndarray) -> tuple[int, np.ndarray]:
    if entry.kind == "keras":
        probs = entry.model.predict(scaled_features, verbose=0)[0]
    else:
        probs = entry.model.predict_proba(scaled_features)[0]
    prediction_code = int(np.argmax(probs))
    return prediction_code, np.asarray(probs, dtype=np.float32)


def _feature_contributions(feature_context: dict, probabilities: np.ndarray, prediction_label: str) -> list[dict]:
    """Return human-readable feature contributions ranked by estimated impact."""
    high_conf = float(probabilities[2]) if len(probabilities) > 2 else 0.0
    low_conf = float(probabilities[0]) if len(probabilities) > 0 else 0.0
    price_spread = feature_context["max_price"] - feature_context["min_price"]
    mid_price = (feature_context["min_price"] + feature_context["max_price"]) / 2

    contributions = [
        {
            "feature": "Price Range",
            "value": f"INR {feature_context['min_price']:,.0f} – {feature_context['max_price']:,.0f}",
            "impact": round(min(price_spread / max(mid_price, 1), 1.0), 3),
            "direction": "positive" if prediction_label == "High" else "negative" if prediction_label == "Low" else "neutral",
            "explanation": f"A {'wide' if price_spread > mid_price * 0.2 else 'tight'} spread of INR {price_spread:,.0f} {'signals strong buyer demand' if prediction_label == 'High' else 'suggests weak market activity' if prediction_label == 'Low' else 'reflects a balanced market'}.",
        },
        {
            "feature": "Commodity",
            "value": feature_context["commodity"],
            "impact": round(high_conf * 0.6, 3),
            "direction": "positive" if prediction_label == "High" else "neutral",
            "explanation": f"{feature_context['commodity']} is the primary crop signal used by the model to anchor price class expectations.",
        },
        {
            "feature": "Market Location",
            "value": f"{feature_context['market']}, {feature_context['district']}, {feature_context['state']}",
            "impact": round((1 - low_conf) * 0.45, 3),
            "direction": "positive" if prediction_label != "Low" else "negative",
            "explanation": f"The {feature_context['market']} market in {feature_context['district']} shapes regional price expectations for this commodity.",
        },
        {
            "feature": "Variety",
            "value": feature_context["variety"],
            "impact": round(high_conf * 0.35, 3),
            "direction": "positive" if prediction_label == "High" else "neutral",
            "explanation": f"Variety '{feature_context['variety']}' carries its own historical price premium or discount relative to the base commodity.",
        },
        {
            "feature": "Grade",
            "value": feature_context["grade"],
            "impact": round(high_conf * 0.28, 3),
            "direction": "positive" if feature_context["grade"].upper() in ("A", "FAQ", "GRADE A") else "neutral",
            "explanation": f"Grade '{feature_context['grade']}' directly affects buyer willingness to pay — higher grades attract premium bids.",
        },
        {
            "feature": "Arrival Date",
            "value": feature_context["arrival_date"],
            "impact": round((1 - low_conf) * 0.2, 3),
            "direction": "neutral",
            "explanation": "Seasonal arrival patterns encoded from the date influence supply-demand balance in the model.",
        },
    ]
    contributions.sort(key=lambda x: x["impact"], reverse=True)
    return contributions


def _recommendation_from_label(prediction_label: str, confidence: float) -> str:
    if prediction_label == "High":
        return "SELL"
    if prediction_label == "Medium" and confidence >= 0.75:
        return "SELL"
    return "HOLD"


def cluster_features(scaled_features: np.ndarray) -> dict:
    if _kmeans is None:
        return {"cluster_id": -1, "cluster_distance": -1.0, "cluster_error": "kmeans_clusterer.pkl was not loaded at startup."}
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
) -> dict:
    t0 = time.perf_counter()

    with _lock:
        if _scaler is None or not _registry or not _feature_columns or not _label_encoders:
            raise RuntimeError("Artifacts not loaded.")
        if min_price > max_price:
            raise ValueError("min_price must be <= max_price.")

        resolved = _resolve(model_type)
        entry = _registry[resolved]
        scaler = _scaler

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
    scaled = scaler.transform(features).astype(np.float32)  # StandardScaler outputs float64; cast to float32 for KMeans + Keras compatibility
    prediction_code, probabilities = _predict_probabilities(entry, scaled)
    prediction_label = MODEL_LABELS[prediction_code]
    intelligence = enrich(entry.model, scaled, prediction_code, prediction_label, min_price, max_price)
    recommendation = _recommendation_from_label(prediction_label, intelligence["confidence"])
    cluster_info = cluster_features(scaled)

    probability_map = {
        MODEL_LABELS[index]: round(float(probabilities[index]), 4)
        for index in range(min(3, len(probabilities)))
    }

    feature_contributions = _feature_contributions(feature_context, probabilities, prediction_label)
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
        "feature_contributions": feature_contributions,
        "latency_ms": latency_ms,
    }


def registry_info() -> list[dict]:
    with _lock:
        info = [
            {
                "model": key,
                "version": value.version,
                "kind": value.kind,
                "loaded_at": value.loaded_at,
            }
            for key, value in _registry.items()
        ]
        if _kmeans is not None:
            info.append({"model": "kmeans_clusterer", "version": _file_version(KMEANS_PATH), "kind": "sklearn", "loaded_at": time.time()})
        return info
