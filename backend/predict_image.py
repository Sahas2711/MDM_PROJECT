"""
CNN food quality inference — thread-safe, loaded once at startup.

Model spec:
  Input : (None, 128, 128, 3)  float32, values in [0, 1]
  Output: Dense(2, softmax)    index 0 = Fresh, index 1 = Rotten
"""

import threading
import time
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

from logger import get_logger

log = get_logger(__name__)

MODEL_PATH = Path(__file__).parent / "models" / "cnn_food_quality_model.h5"

IMG_SIZE = (128, 128)
CLASS_NAMES = ["Fresh", "Rotten"]

_lock = threading.RLock()
_cnn_model = None
_cnn_version: str = ""


def _file_version(path: Path) -> str:
    return str(int(path.stat().st_mtime))


def load_cnn() -> None:
    """Load the CNN model once at startup. Must be called before any prediction."""
    global _cnn_model, _cnn_version

    # Import here so TF/Keras is only loaded if the .h5 file exists,
    # keeping startup fast when the file is absent.
    try:
        from tensorflow import keras  # type: ignore
    except ImportError:
        raise RuntimeError(
            "TensorFlow is not installed. Run: pip install tensorflow"
        )

    with _lock:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"CNN model not found at {MODEL_PATH}")

        log.info("Loading CNN model", extra={"path": str(MODEL_PATH)})
        _cnn_model = keras.models.load_model(MODEL_PATH, compile=False)
        _cnn_version = _file_version(MODEL_PATH)
        log.info("CNN model loaded", extra={"version": _cnn_version})


def _preprocess(image_bytes: bytes) -> np.ndarray:
    """Decode bytes → PIL → resize → normalize → (1, 128, 128, 3) float32."""
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0   # normalize to [0, 1]
    return np.expand_dims(arr, axis=0)               # add batch dim


def predict_image(image_bytes: bytes) -> dict:
    """
    Run CNN inference on raw image bytes.
    Returns {"freshness": str, "confidence": float, "model_version": str, "latency_ms": float}
    """
    t0 = time.perf_counter()

    with _lock:
        if _cnn_model is None:
            raise RuntimeError("CNN model not loaded. Call load_cnn() first.")
        model = _cnn_model
        version = _cnn_version

    # Preprocessing and inference outside the lock
    tensor = _preprocess(image_bytes)
    probs = model.predict(tensor, verbose=0)[0]   # shape: (2,)

    class_idx = int(np.argmax(probs))
    freshness = CLASS_NAMES[class_idx]
    confidence = round(float(probs[class_idx]), 4)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    log.info(
        "Image prediction complete",
        extra={
            "freshness": freshness,
            "confidence": confidence,
            "model_version": version,
            "latency_ms": latency_ms,
        },
    )

    return {
        "freshness": freshness,
        "confidence": confidence,
        "model_version": version,
        "latency_ms": latency_ms,
    }


def cnn_info() -> dict | None:
    """Return CNN model metadata for /health, or None if not loaded."""
    with _lock:
        if _cnn_model is None:
            return None
        return {"model": "cnn_food_quality", "version": _cnn_version}
