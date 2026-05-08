import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from logger import get_logger
from database import init_db, save_prediction, get_history, get_analytics, create_user, get_user
from auth import hash_password, verify_password, create_token, decode_token
from crop_recommendation import recommend as crop_recommend
import enhance as enhancer
from schemas import (
    ClustersResponse, HealthResponse, ImagePredictResponse, ModelMetricsResponse,
    ModelType, PredictRequest, PredictResponse, SmartDecisionResponse,
)
import predict as predictor
import predict_image as image_predictor
import smart_decision as decision_engine

log = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
bearer = HTTPBearer(auto_error=False)


def optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str | None:
    if credentials:
        return decode_token(credentials.credentials)
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — loading ML artifacts")
    init_db()
    predictor.load_artifacts()
    try:
        image_predictor.load_models()
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
@limiter.limit("30/minute")
def predict(
    request: Request,
    payload: PredictRequest,
    model_type: Optional[ModelType] = Query(default="best"),
):
    try:
        result = predictor.predict(payload.min_price, payload.max_price, model_type=model_type)
        save_prediction(result["model_used"], result["recommendation"], result["confidence"],
                        payload.min_price, payload.max_price, result["latency_ms"], "/predict")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        log.exception("Unexpected prediction error")
        raise HTTPException(status_code=500, detail="Internal server error")


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/predict-image", response_model=ImagePredictResponse)
async def predict_image(
    file: UploadFile = File(..., description="Food image (JPEG/PNG/WEBP/BMP)"),
    enable_enhancement: bool = Query(default=False, description="Run Real-ESRGAN before CNN inference"),
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

    enhancement_meta: dict = {"enhanced": False, "reason": "disabled"}
    if enable_enhancement:
        image_bytes, enhancement_meta = enhancer.enhance(image_bytes)

    try:
        result = image_predictor.predict_image(image_bytes, enhancement_meta=enhancement_meta)
        return result
    except RuntimeError as exc:
        log.error("CNN model unavailable", extra={"detail": str(exc)})
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        log.exception("Unexpected image prediction error")
        raise HTTPException(status_code=500, detail="Image prediction failed.")


@app.get("/model-metrics", response_model=ModelMetricsResponse)
def model_metrics():
    """Return notebook-confirmed accuracy metrics for all trained models."""
    return {"metrics": predictor.get_model_metrics()}


@app.get("/clusters", response_model=ClustersResponse)
def clusters(n_samples: int = Query(default=120, ge=20, le=300)):
    """Return real KMeans cluster assignments on a stratified sample."""
    try:
        return predictor.get_cluster_sample(n_samples)
    except Exception as exc:
        log.exception("Cluster sample failed")
        raise HTTPException(status_code=500, detail="Cluster generation failed.")


@app.post("/smart-decision", response_model=SmartDecisionResponse)
async def smart_decision(
    file: UploadFile = File(..., description="Food image (JPEG/PNG/WEBP/BMP)"),
    crop_hint: str = Query(
        default="",
        description="Optional crop name hint for market price lookup (e.g. wheat, tomato, apple)",
    ),
    model_type: Optional[ModelType] = Query(
        default="best",
        description="ML model to use: random_forest | ann | dnn | best",
    ),
    enable_enhancement: bool = Query(
        default=False,
        description="Run Real-ESRGAN upscaling before the image pipeline",
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
            enable_enhancement=enable_enhancement,
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

# ── Auth ──────────────────────────────────────────────────────────────────────
from pydantic import BaseModel as _BM

class _AuthPayload(_BM):
    username: str
    password: str

@app.post("/auth/register", tags=["auth"])
def register(payload: _AuthPayload):
    ok = create_user(payload.username, hash_password(payload.password))
    if not ok:
        raise HTTPException(status_code=409, detail="Username already exists.")
    return {"message": "User created."}

@app.post("/auth/login", tags=["auth"])
def login(payload: _AuthPayload):
    user = get_user(payload.username)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    return {"access_token": create_token(payload.username), "token_type": "bearer"}


# ── Prediction history & analytics ───────────────────────────────────────────
@app.get("/history", tags=["analytics"])
def history(limit: int = Query(default=50, ge=1, le=200)):
    return {"history": get_history(limit)}

@app.get("/analytics", tags=["analytics"])
def analytics():
    return get_analytics()


# ── Crop recommendation ───────────────────────────────────────────────────────
class _CropRecoPayload(_BM):
    season: str = "kharif"
    budget: int = 20000
    soil_type: str = "loamy"

@app.post("/crop-recommendation", tags=["recommendation"])
def crop_recommendation(payload: _CropRecoPayload):
    try:
        return crop_recommend(payload.season, payload.budget, payload.soil_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
