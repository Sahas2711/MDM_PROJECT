import joblib
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from config import settings
from intelligence import enrich
from logger import get_logger

log = get_logger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
SCALER_PATH = MODELS_DIR / "scaler.pkl"

MODEL_FILES: dict[str, str] = {
    "random_forest":     "crop_model.pkl",
    "gradient_boosting": "gb_model.pkl",
    "ann":               "ann_model.pkl",
}


@dataclass
class ModelEntry:
    model: object
    version: str                        # derived from file mtime
    loaded_at: float = field(default_factory=time.time)


# ── Thread-safe registry ──────────────────────────────────────────────────────
_lock = threading.RLock()
_registry: dict[str, ModelEntry] = {}
_scaler = None
_scaler_version: str = ""


def _file_version(path: Path) -> str:
    """Use last-modified timestamp as a lightweight version string."""
    return str(int(path.stat().st_mtime))


def load_artifacts() -> None:
    """Load scaler + all available models. Safe to call once at startup."""
    global _scaler, _scaler_version

    with _lock:
        log.info("Loading scaler", extra={"path": str(SCALER_PATH)})
        _scaler = joblib.load(SCALER_PATH)
        _scaler_version = _file_version(SCALER_PATH)
        log.info("Scaler loaded", extra={"version": _scaler_version})

        for model_type, filename in MODEL_FILES.items():
            path = MODELS_DIR / filename
            if not path.exists():
                log.warning("Model file not found, skipping", extra={"model": model_type, "file": filename})
                continue
            try:
                model = joblib.load(path)
                version = _file_version(path)
                _registry[model_type] = ModelEntry(model=model, version=version)
                log.info("Model loaded", extra={"model": model_type, "version": version})
            except Exception as exc:
                log.error("Failed to load model", extra={"model": model_type, "error": str(exc)})

        if not _registry:
            raise RuntimeError("No model files could be loaded. Cannot start.")

        log.info("Artifact loading complete", extra={"models": list(_registry.keys())})


def _resolve(model_type: str) -> str:
    """Resolve 'best' alias and validate the key is in the registry."""
    key = settings.default_model if model_type == "best" else model_type
    if key not in _registry:
        raise ValueError(
            f"Model '{model_type}' is not available. "
            f"Available: {list(_registry.keys())}"
        )
    return key


def predict(min_price: float, max_price: float, model_type: str = "best") -> dict:
    """
    Thread-safe inference. Registry is read under RLock.
    Returns {"model_used", "model_version", "prediction", "recommendation", "latency_ms"}
    """
    t0 = time.perf_counter()

    with _lock:
        if _scaler is None or not _registry:
            raise RuntimeError("Artifacts not loaded.")

        if min_price > max_price:
            raise ValueError("min_price must be <= max_price.")

        resolved = _resolve(model_type)
        entry = _registry[resolved]
        scaler = _scaler          # local refs — safe outside lock
        model = entry.model
        version = entry.version

    features = np.array([[min_price, max_price]])
    scaled = scaler.transform(features)
    result = int(model.predict(scaled)[0])
    recommendation = "SELL" if result == 1 else "HOLD"
    intelligence = enrich(model, scaled, result, min_price, max_price)

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    log.info(
        "Prediction complete",
        extra={
            "model": resolved,
            "version": version,
            "prediction": result,
            "recommendation": recommendation,
            "confidence": intelligence["confidence"],
            "latency_ms": latency_ms,
        },
    )

    return {
        "model_used": resolved,
        "model_version": version,
        "prediction": result,
        "recommendation": recommendation,
        "latency_ms": latency_ms,
        **intelligence,
    }


def registry_info() -> list[dict]:
    """Return metadata for all loaded models (used by /health)."""
    with _lock:
        return [
            {
                "model": k,
                "version": v.version,
                "loaded_at": v.loaded_at,
            }
            for k, v in _registry.items()
        ]
