# Backend Reference — AgriIntel AI Dashboard

> Stack: FastAPI · scikit-learn · TensorFlow/Keras · joblib · Pydantic v2 · Python 3.11

---

## File Structure

```
backend/
├── main.py            # FastAPI app, routes, middleware
├── predict.py         # Price model registry + inference
├── predict_image.py   # CNN loader + image inference
├── smart_decision.py  # Combined decision engine
├── intelligence.py    # Confidence, analysis, insight enrichment
├── schemas.py         # Pydantic request/response models
├── config.py          # Settings (pydantic-settings, .env support)
├── logger.py          # JSON structured logger
├── requirements.txt
└── models/
    ├── crop_model.pkl              # Random Forest (ACTIVE)
    ├── scaler.pkl                  # StandardScaler (ACTIVE)
    ├── features.pkl                # Feature name list (present, unused)
    ├── cnn_food_quality_model.h5   # CNN classifier (ACTIVE)
    ├── gb_model.pkl                # Gradient Boosting (MISSING)
    └── ann_model.pkl               # ANN (MISSING)
```

---

## How to Run

```bash
# from project root
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Or from inside `backend/`:
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Startup Sequence (`main.py` lifespan)

1. `predictor.load_artifacts()` — loads `scaler.pkl` + all available `.pkl` models via joblib
2. `image_predictor.load_cnn()` — loads `cnn_food_quality_model.h5` via Keras (wrapped in try/except — CNN failure is a warning, not a crash)
3. App starts serving requests

---

## Endpoints

### `GET /health`

Returns status of all loaded models.

**Response:**
```json
{
  "status": "ok",
  "app_version": "1.0.0",
  "default_model": "random_forest",
  "models": [
    { "model": "random_forest", "version": "1776534655", "loaded_at": 1713456789.0 }
  ],
  "cnn_model": { "model": "cnn_food_quality", "version": "1776496273" }
}
```

---

### `POST /predict`

Price-based SELL/HOLD prediction.

**Request body (JSON):**
```json
{ "min_price": 1200.0, "max_price": 1800.0 }
```

**Query param:**
| Param | Type | Default | Options |
|-------|------|---------|---------|
| `model_type` | string | `best` | `random_forest`, `gradient_boosting`, `ann`, `best` |

**Response:**
```json
{
  "model_used": "random_forest",
  "model_version": "1776534655",
  "prediction": 1,
  "recommendation": "SELL",
  "confidence": 0.97,
  "price_range_analysis": "High price spread indicates strong demand and elevated market activity.",
  "market_insight": "Strong demand spread — favorable conditions for immediate selling.",
  "latency_ms": 3.41
}
```

**Error codes:**
| Code | Cause |
|------|-------|
| 422 | Invalid input (price out of bounds, min > max, unknown model_type) |
| 503 | Model not loaded |
| 500 | Unexpected server error |

---

### `POST /predict-image`

CNN freshness classification from uploaded image.

**Request:** `multipart/form-data` with field `file`

**Accepted types:** `image/jpeg`, `image/png`, `image/webp`, `image/bmp`
**Max size:** 10 MB

**Response:**
```json
{
  "freshness": "Fresh",
  "confidence": 0.9823,
  "model_version": "1776496273",
  "latency_ms": 42.1
}
```

**Error codes:**
| Code | Cause |
|------|-------|
| 415 | Unsupported file type |
| 413 | File exceeds 10 MB |
| 422 | Empty file |
| 503 | CNN model not loaded |
| 500 | Unexpected error |

---

### `POST /smart-decision`

Combines CNN freshness + price ML into one final recommendation.

**Request:** `multipart/form-data` with field `file`

**Query params:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `min_price` | float | yes | — |
| `max_price` | float | yes | — |
| `model_type` | string | no | `best` |

**Decision logic:**
```
if freshness == "Rotten"  →  recommendation = "DO NOT SELL"
else                       →  recommendation = ML result (SELL or HOLD)
```

**Response:**
```json
{
  "freshness": "Fresh",
  "confidence": 0.9823,
  "recommendation": "SELL",
  "market_insight": "Strong demand spread — favorable conditions for immediate selling.",
  "price_range_analysis": "High price spread indicates strong demand.",
  "ml_model_used": "random_forest",
  "final_decision_reason": "Crop is Fresh and market conditions are favorable. The ML model signals strong demand — this is a good time to sell.",
  "latency_ms": 58.3
}
```

**Error codes:** same as `/predict-image` + 422 for price validation

---

## Module Details

### `predict.py` — Price Model Registry

| Item | Detail |
|------|--------|
| Loader | `joblib.load()` (not pickle) |
| Thread safety | `threading.RLock` — registry reads/writes under lock, inference outside |
| Model versioning | `str(int(path.stat().st_mtime))` — file mtime as version string |
| `"best"` alias | Resolves to `settings.default_model` (currently `random_forest`) |
| Missing files | Skipped with WARNING log, not a crash |
| Features | `[min_price, max_price]` → scaled → model |
| Output classes | `0` = HOLD, `1` = SELL |

**Key functions:**
- `load_artifacts()` — call once at startup
- `predict(min_price, max_price, model_type)` → dict
- `registry_info()` → list of loaded model metadata
- `available_models()` → list of model keys

---

### `predict_image.py` — CNN Inference

| Item | Detail |
|------|--------|
| Model file | `cnn_food_quality_model.h5` |
| Input shape | `(None, 128, 128, 3)` float32 |
| Output | `Dense(2, softmax)` — index 0 = Fresh, index 1 = Rotten |
| Preprocessing | PIL decode → RGB convert → resize 128×128 (BILINEAR) → `/255.0` normalize → batch dim |
| Thread safety | Same `RLock` pattern — model ref copied inside lock, inference outside |
| TF import | Lazy — inside `load_cnn()` only, so startup is fast if file is absent |

**Key functions:**
- `load_cnn()` — call once at startup
- `predict_image(image_bytes)` → dict
- `cnn_info()` → metadata dict or None

---

### `smart_decision.py` — Combined Engine

Runs CNN first, then price ML, then applies decision rule. No cross-lock contention — each sub-module manages its own lock independently.

**Reason templates (3):**
- Rotten → fixed warning message
- Fresh + SELL → fresh message + market_insight appended
- Fresh + HOLD → hold message + market_insight appended

**Key function:**
- `decide(image_bytes, min_price, max_price, model_type)` → dict

---

### `intelligence.py` — Enrichment Layer

Adds `confidence`, `price_range_analysis`, `market_insight` to every price prediction.

**Spread tier system:**

| Tier | Condition (`(max-min)/mid`) |
|------|-----------------------------|
| `tight` | ≤ 0.05 |
| `moderate` | ≤ 0.15 |
| `wide` | ≤ 0.30 |
| `very_wide` | > 0.30 |

**Confidence:**
- Uses `model.predict_proba()` when available (Random Forest, Gradient Boosting)
- Falls back to spread-tier heuristic for models without `predict_proba` (ANN)

**Market insight:** 8 combinations of `prediction (0/1) × spread_tier` → fixed actionable sentence

**Key function:**
- `enrich(model, scaled_features, prediction, min_price, max_price)` → dict with 3 keys

---

### `schemas.py` — Pydantic Models

| Schema | Used by | Key fields |
|--------|---------|------------|
| `PredictRequest` | `POST /predict` | `min_price`, `max_price` — bounds from config + `@model_validator` for order |
| `PredictResponse` | `POST /predict` | model_used, model_version, prediction, recommendation, confidence, price_range_analysis, market_insight, latency_ms |
| `ImagePredictResponse` | `POST /predict-image` | freshness, confidence, model_version, latency_ms |
| `SmartDecisionResponse` | `POST /smart-decision` | freshness, confidence, recommendation, market_insight, price_range_analysis, ml_model_used, final_decision_reason, latency_ms |
| `HealthResponse` | `GET /health` | status, app_version, default_model, models, cnn_model |
| `ModelType` | query param | `Literal["random_forest", "gradient_boosting", "ann", "best"]` |

---

### `config.py` — Settings

All values readable from `.env` file (via `pydantic-settings`).

| Setting | Default | Description |
|---------|---------|-------------|
| `app_version` | `"1.0.0"` | Returned in `/health` |
| `default_model` | `"random_forest"` | Resolved when `model_type=best` |
| `log_level` | `"INFO"` | Logger level |
| `min_price_floor` | `1.0` | Pydantic `gt` bound on min_price |
| `min_price_ceiling` | `1_000_000.0` | Pydantic `le` bound on min_price |
| `max_price_floor` | `1.0` | Pydantic `gt` bound on max_price |
| `max_price_ceiling` | `1_000_000.0` | Pydantic `le` bound on max_price |

---

### `logger.py` — Structured Logging

- Format: JSON via `python-json-logger`
- Output: `stdout`
- Fields per line: `asctime`, `levelname`, `name`, `message` + any `extra={}` kwargs
- Per-module loggers via `get_logger(__name__)` — no duplicate handlers

---

## Middleware

### CORS
```python
allow_origins=["*"]   # tighten in production
allow_methods=["*"]
allow_headers=["*"]
```

### Request Logging
Every HTTP request logs:
- On start: `request_id` (8-char UUID), method, path
- On finish: `request_id`, status code, `duration_ms`

Response headers added automatically:
- `X-Request-ID` — 8-char UUID per request
- `X-Response-Time-Ms` — total handler duration

---

## ML Models

| Model | File | Format | Features | Output | Status |
|-------|------|--------|----------|--------|--------|
| Random Forest | `crop_model.pkl` | joblib | `[min_price, max_price]` scaled | 0=HOLD, 1=SELL | Active |
| StandardScaler | `scaler.pkl` | joblib | fits `[min_price, max_price]` | scaled array | Active |
| CNN Food Quality | `cnn_food_quality_model.h5` | Keras HDF5 | 128×128 RGB image | 0=Fresh, 1=Rotten (softmax) | Active |
| Gradient Boosting | `gb_model.pkl` | joblib | same as RF | same as RF | Missing |
| ANN | `ann_model.pkl` | joblib | same as RF | same as RF | Missing |
| Feature names | `features.pkl` | joblib | list of strings | — | Present, unused |

**Training data:** `dataset/crop_prices.csv` (8,578 rows)
**Label:** `modal_price >= median(modal_price)` → 1 (SELL), else 0 (HOLD)

---

## Error Handling Summary

| Exception type | HTTP code | Where |
|----------------|-----------|-------|
| `ValueError` | 422 | `/predict`, `/smart-decision` |
| `RuntimeError` (model not loaded) | 503 | all prediction endpoints |
| Wrong content type | 415 | `/predict-image`, `/smart-decision` |
| File too large | 413 | `/predict-image`, `/smart-decision` |
| Empty file | 422 | `/predict-image`, `/smart-decision` |
| Any other exception | 500 | all endpoints — generic message, full traceback in logs |

---

## Dependencies (`requirements.txt`)

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn[standard]` | ASGI server |
| `scikit-learn` | Random Forest, StandardScaler |
| `joblib` | Model serialization (load `.pkl` files) |
| `numpy` | Feature array construction |
| `pydantic` | Request/response validation |
| `pydantic-settings` | `.env` config loading |
| `python-json-logger` | JSON structured logging |
| `tensorflow` | CNN model loading + inference |
| `Pillow` | Image decode, resize, convert |
| `python-multipart` | FastAPI `UploadFile` support |
