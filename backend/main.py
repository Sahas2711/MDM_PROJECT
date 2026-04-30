import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from logger import get_logger
from schemas import HealthResponse, ImagePredictResponse, ModelType, PredictRequest, PredictResponse, SmartDecisionResponse
import predict as predictor
import predict_image as image_predictor
import smart_decision as decision_engine

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — loading ML artifacts")
    predictor.load_artifacts()
    try:
        image_predictor.load_cnn()
    except Exception as exc:
        log.warning("CNN model failed to load — /predict-image unavailable", extra={"error": str(exc)})
    log.info("Startup complete")
    yield
    log.info("Shutting down")


app = FastAPI(
    title="Crop Price Prediction API",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    t0 = time.perf_counter()

    log.info(
        "Request started",
        extra={"request_id": request_id, "method": request.method, "path": request.url.path},
    )

    response = await call_next(request)
    elapsed = round((time.perf_counter() - t0) * 1000, 2)

    log.info(
        "Request finished",
        extra={
            "request_id": request_id,
            "status_code": response.status_code,
            "duration_ms": elapsed,
        },
    )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(elapsed)
    return response


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "app_version": settings.app_version,
        "default_model": settings.default_model,
        "models": predictor.registry_info(),
        "cnn_model": image_predictor.cnn_info(),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(
    payload: PredictRequest,
    model_type: Optional[ModelType] = Query(
        default="best",
        description="Model to use: random_forest | gradient_boosting | ann | best",
    ),
):
    try:
        result = predictor.predict(
            payload.min_price,
            payload.max_price,
            model_type=model_type,
        )
        return result
    except ValueError as exc:
        log.warning("Validation error", extra={"detail": str(exc)})
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        log.error("Runtime error", extra={"detail": str(exc)})
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        log.exception("Unexpected prediction error")
        raise HTTPException(status_code=500, detail="Internal server error")


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/predict-image", response_model=ImagePredictResponse)
async def predict_image(file: UploadFile = File(..., description="Food image (JPEG/PNG/WEBP/BMP)")):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit.")

    try:
        result = image_predictor.predict_image(image_bytes)
        return result
    except RuntimeError as exc:
        log.error("CNN model unavailable", extra={"detail": str(exc)})
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        log.exception("Unexpected image prediction error")
        raise HTTPException(status_code=500, detail="Image prediction failed.")


@app.post("/smart-decision", response_model=SmartDecisionResponse)
async def smart_decision(
    file: UploadFile = File(..., description="Food image (JPEG/PNG/WEBP/BMP)"),
    crop_hint: str = Query(
        default="",
        description="Optional crop name hint for market price lookup (e.g. wheat, tomato, apple)",
    ),
    model_type: Optional[ModelType] = Query(
        default="best",
        description="ML model to use: random_forest | gradient_boosting | ann | best",
    ),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit.")

    try:
        result = await decision_engine.decide(
            image_bytes=image_bytes,
            crop_hint=crop_hint,
            model_type=model_type,
        )
        return result
    except ValueError as exc:
        log.warning("Smart decision validation error", extra={"detail": str(exc)})
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        log.error("Smart decision runtime error", extra={"detail": str(exc)})
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        log.exception("Unexpected smart decision error")
        raise HTTPException(status_code=500, detail="Smart decision failed.")
