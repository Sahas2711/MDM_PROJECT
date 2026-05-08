import threading
import time
from io import BytesIO
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from config import settings
from logger import get_logger

log = get_logger(__name__)

MODELS_DIR = Path(__file__).parent / "models"
ULTRALYTICS_DIR = Path(__file__).parent / ".ultralytics"
FRESHNESS_MODEL_PATH = MODELS_DIR / "cnn_food_quality_model.h5"
FRUIT_MODEL_PATH = MODELS_DIR / "fruit_classifier.h5"
YOLO_MODEL_PATH = MODELS_DIR / "yolov8n.pt"

FRESHNESS_IMG_SIZE = (128, 128)
FRUIT_IMG_SIZE = (224, 224)
FRESHNESS_CLASS_NAMES = ["Fresh", "Rotten"]
FRUIT_CLASS_NAMES = [
    "fresh apple", "fresh banana", "fresh orange", "fresh mango", "fresh strawberry",
    "rotten apple", "rotten banana", "rotten orange", "rotten mango", "rotten strawberry",
    "fresh potato", "fresh cucumber", "fresh carrot", "fresh tomato", "fresh bell pepper",
    "rotten potato", "rotten cucumber", "rotten carrot", "rotten tomato", "rotten bell pepper",
]
YOLO_ALLOWED_LABELS = {"apple", "banana", "orange", "carrot"}
YOLO_FRUIT_THRESHOLD = 0.35

_lock = threading.RLock()
_freshness_model = None
_fruit_model = None
_yolo_model = None
_freshness_version: str = ""
_fruit_version: str = ""


def _file_version(path: Path) -> str:
    return str(int(path.stat().st_mtime))


def load_models() -> None:
    global _freshness_model, _fruit_model, _yolo_model, _freshness_version, _fruit_version

    try:
        from tensorflow import keras  # type: ignore
    except ImportError as exc:
        raise RuntimeError("TensorFlow is not installed. Run: pip install tensorflow") from exc

    with _lock:
        if FRESHNESS_MODEL_PATH.exists():
            log.info("Loading freshness CNN", extra={"path": str(FRESHNESS_MODEL_PATH)})
            _freshness_model = keras.models.load_model(FRESHNESS_MODEL_PATH, compile=False)
            _freshness_version = _file_version(FRESHNESS_MODEL_PATH)

        if FRUIT_MODEL_PATH.exists():
            log.info("Loading fruit classifier", extra={"path": str(FRUIT_MODEL_PATH)})
            _fruit_model = keras.models.load_model(FRUIT_MODEL_PATH, compile=False)
            _fruit_version = _file_version(FRUIT_MODEL_PATH)

        if _yolo_model is None:
            ULTRALYTICS_DIR.mkdir(parents=True, exist_ok=True)
            os.environ.setdefault("YOLO_CONFIG_DIR", str(ULTRALYTICS_DIR))
            os.environ.setdefault("ULTRALYTICS_CONFIG_DIR", str(ULTRALYTICS_DIR))
            from ultralytics import YOLO
            log.info("Loading YOLO fruit detector", extra={"model": str(YOLO_MODEL_PATH)})
            _yolo_model = YOLO(str(YOLO_MODEL_PATH))

        if _freshness_model is None:
            raise FileNotFoundError(f"Freshness CNN not found at {FRESHNESS_MODEL_PATH}")


def _decode_image(image_bytes: bytes) -> Image.Image:
    if not image_bytes or len(image_bytes) < 8:
        raise ValueError("Image bytes are empty or too small to be a valid image.")

    # Try cv2 first — avoids Ultralytics PIL patch issues after pi-heif install
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is not None:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)

    # Fallback to PIL
    try:
        img = Image.open(BytesIO(image_bytes))
        return img.convert("RGB")
    except Exception as exc:
        raise ValueError(
            f"Cannot decode image: not a valid JPEG/PNG/WEBP/BMP. "
            f"Received {len(image_bytes)} bytes. Detail: {exc}"
        ) from exc


def _preprocess_pil(image: Image.Image, size: tuple[int, int]) -> np.ndarray:
    resized = image.resize(size, Image.BILINEAR)
    arr = np.array(resized, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _preprocess_cv(crop: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    resized = cv2.resize(crop, size)
    arr = resized.astype(np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _predict_fruit_domain(image: Image.Image) -> dict:
    if _fruit_model is None or _yolo_model is None:
        return {
            "fruit_detected": True,
            "fruit_confidence": 0.0,
            "fruit_classifier_top_index": -1,
            "fruit_label": "unknown",
            "fruit_reason": "Fruit detector was not available, so fruit validation was skipped.",
            "fruit_model_version": None,
            "fruit_detector_label": None,
        }

    rgb = np.array(image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    detections = _yolo_model(bgr, verbose=False)

    best_label = "unknown"
    best_conf = 0.0
    best_index = -1
    best_detector_label = None
    best_detector_conf = 0.0

    for result in detections:
        boxes = result.boxes.xyxy.cpu().numpy() if result.boxes is not None else []
        scores = result.boxes.conf.cpu().numpy() if result.boxes is not None else []
        classes = result.boxes.cls.cpu().numpy() if result.boxes is not None else []

        for box, score, cls in zip(boxes, scores, classes):
            detector_label = _yolo_model.names[int(cls)]
            if detector_label not in YOLO_ALLOWED_LABELS:
                continue

            x1, y1, x2, y2 = map(int, box)
            crop = rgb[max(y1, 0):max(y2, 0), max(x1, 0):max(x2, 0)]
            if crop.size == 0:
                continue

            preds = _fruit_model.predict(_preprocess_cv(crop, FRUIT_IMG_SIZE), verbose=0)[0]
            class_id = int(np.argmax(preds))
            confidence = float(np.max(preds))
            predicted_label = FRUIT_CLASS_NAMES[class_id]

            if confidence > best_conf:
                best_conf = confidence
                best_index = class_id
                best_label = predicted_label
                best_detector_label = detector_label
                best_detector_conf = float(score)

    fruit_detected = best_detector_label is not None and best_detector_conf >= YOLO_FRUIT_THRESHOLD
    if fruit_detected:
        reason = (
            f"YOLO detected '{best_detector_label}' with confidence {best_detector_conf:.2f}. "
            f"The auxiliary fruit classifier suggested '{best_label}' with confidence {best_conf:.2f}."
        )
    else:
        reason = (
            "YOLO could not confidently detect a supported fruit object in the image, "
            f"and the auxiliary fruit classifier confidence stayed at {best_conf:.2f}."
        )

    return {
        "fruit_detected": fruit_detected,
        "fruit_confidence": round(best_conf, 4),
        "fruit_detector_confidence": round(best_detector_conf, 4),
        "fruit_classifier_top_index": best_index,
        "fruit_label": best_label,
        "fruit_reason": reason,
        "fruit_model_version": _fruit_version,
        "fruit_detector_label": best_detector_label,
    }


def predict_image(image_bytes: bytes, enhancement_meta: dict | None = None) -> dict:
    t0 = time.perf_counter()

    with _lock:
        if _freshness_model is None:
            raise RuntimeError("Freshness CNN model not loaded. Call load_models() first.")
        freshness_model = _freshness_model
        freshness_version = _freshness_version

    image = _decode_image(image_bytes)
    fruit_result = _predict_fruit_domain(image)
    if not fruit_result["fruit_detected"]:
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "freshness": "Not Fruit",
            "confidence": 0.0,
            "model_version": freshness_version,
            "latency_ms": latency_ms,
            "image_reason": "The image failed the fruit check, so freshness analysis was not run.",
            "preprocessing": {
                "original_size": list(image.size),
                "resized_to": list(FRESHNESS_IMG_SIZE),
                "normalized": True,
                "decoder": "cv2",
                "enhancement": enhancement_meta or {"enhanced": False, "reason": "not_requested"},
            },
            **fruit_result,
        }

    probs = freshness_model.predict(_preprocess_pil(image, FRESHNESS_IMG_SIZE), verbose=0)[0]
    class_idx = int(np.argmax(probs))
    freshness = FRESHNESS_CLASS_NAMES[class_idx]
    confidence = round(float(probs[class_idx]), 4)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    image_reason = (
        "The freshness CNN sees strong fresh-quality visual signals in the uploaded image."
        if freshness == "Fresh"
        else "The freshness CNN sees visible spoilage or quality loss in the uploaded image."
    )

    return {
        "freshness": freshness,
        "confidence": confidence,
        "model_version": freshness_version,
        "latency_ms": latency_ms,
        "image_reason": image_reason,
        "preprocessing": {
            "original_size": list(image.size),
            "resized_to": list(FRESHNESS_IMG_SIZE),
            "normalized": True,
            "decoder": "cv2",
            "enhancement": enhancement_meta or {"enhanced": False, "reason": "not_requested"},
        },
        **fruit_result,
    }


def analyze_image(image_bytes: bytes, enhancement_meta: dict | None = None) -> dict:
    return predict_image(image_bytes, enhancement_meta=enhancement_meta)


def cnn_info() -> dict | None:
    with _lock:
        if _freshness_model is None:
            return None
        return {
            "model": "cnn_food_quality",
            "version": _freshness_version,
            "fruit_classifier_version": _fruit_version or None,
            "fruit_detector": "yolov8n",
        }
