"""
Real-ESRGAN image enhancement stage.
Uses pretrained weights only — no training.
GPU auto-detected, falls back to CPU.
"""
import threading
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

from logger import get_logger

log = get_logger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "models" / "realesrgan"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

_lock = threading.RLock()
_upsampler = None
_available = False


def _load() -> None:
    global _upsampler, _available
    with _lock:
        if _upsampler is not None:
            return
        try:
            import torch
            from basicsr.archs.rrdbnet_arch import RRDBNet
            from realesrgan import RealESRGANer

            weight_path = WEIGHTS_DIR / "RealESRGAN_x4plus.pth"
            if not weight_path.exists():
                _download_weights(weight_path)

            model = RRDBNet(
                num_in_ch=3, num_out_ch=3,
                num_feat=64, num_block=23, num_grow_ch=32, scale=4,
            )
            device = "cuda" if torch.cuda.is_available() else "cpu"
            log.info("Loading Real-ESRGAN", extra={"device": device, "weights": str(weight_path)})

            _upsampler = RealESRGANer(
                scale=4,
                model_path=str(weight_path),
                model=model,
                tile=256,          # tile to limit VRAM / RAM usage
                tile_pad=10,
                pre_pad=0,
                half=torch.cuda.is_available(),
                device=device,
            )
            _available = True
            log.info("Real-ESRGAN loaded", extra={"device": device})
        except Exception as exc:
            log.warning("Real-ESRGAN unavailable — enhancement disabled", extra={"error": str(exc)})
            _available = False


def _download_weights(dest: Path) -> None:
    import urllib.request
    url = (
        "https://github.com/xinntao/Real-ESRGAN/releases/download/"
        "v0.1.0/RealESRGAN_x4plus.pth"
    )
    log.info("Downloading Real-ESRGAN weights", extra={"url": url, "dest": str(dest)})
    urllib.request.urlretrieve(url, dest)
    log.info("Weights downloaded", extra={"size_mb": round(dest.stat().st_size / 1e6, 1)})


def is_available() -> bool:
    return _available


def enhance(image_bytes: bytes) -> tuple[bytes, dict]:
    """
    Enhance image bytes with Real-ESRGAN x4.
    Returns (enhanced_bytes, meta_dict).
    Falls back to original bytes if enhancement fails.
    """
    _load()

    meta = {"enhanced": False, "reason": "not_attempted"}

    if not _available or _upsampler is None:
        meta["reason"] = "realesrgan_unavailable"
        return image_bytes, meta

    try:
        import cv2

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if bgr is None:
            meta["reason"] = "decode_failed"
            return image_bytes, meta

        original_h, original_w = bgr.shape[:2]

        # Skip enhancement for large images — already high-res
        if original_w >= 1024 or original_h >= 1024:
            meta["reason"] = "skipped_already_hires"
            meta["original_size"] = [original_w, original_h]
            return image_bytes, meta

        with _lock:
            enhanced_bgr, _ = _upsampler.enhance(bgr, outscale=4)

        # Downscale back to a reasonable size to avoid bloating downstream models
        target_w = min(enhanced_bgr.shape[1], 512)
        target_h = min(enhanced_bgr.shape[0], 512)
        enhanced_bgr = cv2.resize(enhanced_bgr, (target_w, target_h), interpolation=cv2.INTER_AREA)

        ok, buf = cv2.imencode(".jpg", enhanced_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if not ok:
            meta["reason"] = "encode_failed"
            return image_bytes, meta

        meta = {
            "enhanced": True,
            "reason": "ok",
            "original_size": [original_w, original_h],
            "enhanced_size": [target_w, target_h],
        }
        return buf.tobytes(), meta

    except Exception as exc:
        log.warning("Real-ESRGAN enhancement failed — using original", extra={"error": str(exc)})
        meta["reason"] = f"error: {exc}"
        return image_bytes, meta


def enhance_to_pil(image_bytes: bytes) -> tuple[bytes, dict]:
    """Convenience wrapper — same as enhance()."""
    return enhance(image_bytes)
