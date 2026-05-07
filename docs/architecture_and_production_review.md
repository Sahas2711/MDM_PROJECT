# Architecture & Production Review

---

## System Architecture

```
Browser (React + Vite)
    │
    ├── /predict          → FastAPI (port 8000) → ModelRegistry → RF / ANN / DNN
    ├── /predict-image    → FastAPI (port 8000) → YOLO → FruitClassifier → FreshnessCNN
    ├── /smart-decision   → FastAPI (port 8000) → Full 9-node pipeline
    ├── /health           → FastAPI (port 8000) → Registry info (unused by UI)
    │
    └── /voice-chat       → FastAPI (port 8001) → Groq STT → OpenRouter LLM → HuggingFace TTS
        /ws/voice-chat    → WebSocket streaming variant
```

### Frontend Layer

React 19 + Vite. 7 pages, single `api.js` service layer. Two environment variables: `VITE_API_URL` (default `localhost:8000`) and `VITE_VOICE_API_URL` (default `localhost:8001`). No authentication, no session management, no state persistence across page reloads.

The frontend has a clean separation between UI components (`components/`), page logic (`pages/`), and API calls (`services/api.js`). The `api.js` file is the single point of backend communication — all fetch calls go through it. This is good architecture.

**Weakness**: No global error boundary. A failed API call in one component does not affect others, but there is no centralized error reporting or user notification system beyond per-component error states.

### Backend Layer (Port 8000)

FastAPI with lifespan-based startup loading. All ML artifacts loaded once at startup into module-level globals protected by `threading.RLock()`. This is correct for a single-process server.

Request logging middleware adds `X-Request-ID` and `X-Response-Time-Ms` headers to every response — good observability practice.

CORS is `allow_origins=["*"]` — acceptable for development, must be restricted in production.

**Weakness**: Single-process, single-worker. FastAPI with uvicorn defaults to one worker. Under concurrent load, the `threading.RLock()` in `predict.py` will serialize all inference requests. For a production deployment, multiple workers would require model loading per worker (memory cost) or a shared model server.

### Model Registry

`predict.py` implements a thread-safe singleton registry (`_registry` dict + `_lock` RLock). Models are loaded at startup and never reloaded unless the server restarts. File mtime is used as a version identifier.

**Strength**: Thread-safe, lazy-loaded, version-tracked.
**Weakness**: No hot-reload capability. Updating a model requires server restart. No model health checks after loading.

### Inference Pipelines

Two separate inference pipelines:

**Price Pipeline** (`predict.py`):
Input → `build_feature_context()` → `_feature_array()` → `StandardScaler.transform()` → `_predict_probabilities()` → `enrich()` → `cluster_features()` → response

**Image Pipeline** (`predict_image.py`):
Input bytes → `_decode_image()` → `_predict_fruit_domain()` [YOLO → FruitClassifier] → `freshness_model.predict()` → response

Both pipelines are synchronous (blocking). The image pipeline is called from an `async` FastAPI route but the inference itself is not awaited — it runs in the event loop thread, blocking other requests during inference.

---

## Smart Decision Engine — Complete 9-Node Flow

### Node 1: PREPROCESSING
**Input**: Raw image bytes (JPEG/PNG/WEBP/BMP, max 10MB)
**Process**: `cv2.imdecode()` → RGB conversion → PIL Image. Two resize targets prepared: 128×128 for freshness CNN, 224×224 for fruit classifier. Pixel normalization ÷255.0.
**Output**: Decoded PIL Image, preprocessing metadata (original_size, decoder, normalization flag)
**Status logic**: Always SUCCESS if image decodes successfully
**Why cv2 over PIL**: Avoids Ultralytics PIL patch issues after pi-heif install — documented in code comment

### Node 2: IMAGE_VALIDATION
**Input**: PIL Image (224×224 crop from YOLO bounding box)
**Process**: YOLOv8 (`yolov8n.pt`) detects objects → filters to `YOLO_ALLOWED_LABELS = {"apple", "banana", "orange", "carrot"}` → crops bounding box → `fruit_classifier.h5` predicts 20-class label
**Output**: `fruit_detected` (bool), `fruit_label` (string), `fruit_confidence` (float), `fruit_detector_label` (YOLO class)
**Status logic**: SUCCESS if `fruit_detected=True`, FAILED otherwise
**Critical limitation**: Only 4 YOLO classes are allowed. Mango, tomato, strawberry, potato, cucumber, grapes, bell pepper are all rejected at the YOLO filter stage regardless of what the fruit classifier would predict.

### Node 3: QUALITY_ANALYSIS
**Input**: PIL Image (128×128)
**Process**: `cnn_food_quality_model.h5` binary classification → Fresh / Rotten
**Output**: `freshness` (Fresh/Rotten), `confidence` (float)
**Status logic**: SUCCESS if Node 2 succeeded, SKIPPED otherwise
**Dependency**: Runs on the full image, not the YOLO crop — this means freshness is assessed on the whole image even if only a small fruit was detected in a corner

### Node 4: FEATURE_PIPELINE
**Input**: `crop_hint` string, market price data from Node 7 (fetched in parallel)
**Process**: `build_feature_context()` → `_safe_encode()` for all categorical features → `_feature_array()` → `StandardScaler.transform()` → `.astype(np.float32)`
**Output**: 9-dimensional scaled float32 feature vector + human-readable feature context dict
**Status logic**: SUCCESS if Node 2 succeeded, SKIPPED otherwise

### Node 5: PRICE_MODEL
**Input**: Scaled 9-dim feature vector
**Process**: Active model from registry (`random_forest` by default) → `predict_proba()` or `model.predict()` → argmax → label mapping
**Output**: `prediction_label` (Low/Medium/High), `probabilities` dict, `confidence`, `model_version`
**Status logic**: SUCCESS if Node 2 succeeded, SKIPPED otherwise
**Available models**: RF, ANN, DNN — selectable via `model_type` query param

### Node 6: CLUSTER_ANALYSIS
**Input**: Same scaled 9-dim feature vector as Node 5
**Process**: `kmeans_clusterer.pkl` → `predict()` → cluster_id; `transform()` → centroid distance
**Output**: `cluster_id` (0–8), `cluster_distance` (float)
**Status logic**: SUCCESS / FAILED (dtype error) / PARTIAL (id=-1 without error)
**Known bug**: StandardScaler outputs float64; KMeans C extension requires float32. Fixed by `.astype(np.float32)` in `predict.py`. If this fix is absent, node fails.

### Node 7: MARKET_ENRICHMENT
**Input**: `crop_hint` string
**Process**: DuckDuckGo Instant Answer API (4s timeout) → regex price extraction → fallback to hardcoded `_FALLBACK_PRICES` dict
**Output**: `min_price`, `max_price`, `source` (web_search or dataset_median), `source_reason`
**Status logic**: SUCCESS if live prices found, PARTIAL if fallback used
**Reality**: DuckDuckGo Instant Answer API almost never returns structured price data for Indian mandi queries. In practice, `source` is always `dataset_median`. The "live web search" capability is effectively non-functional.

### Node 8: DECISION_ENGINE
**Input**: freshness, prediction_label, cluster_id, market trend, mid_price
**Process**: Quality adjustment factor (Fresh=0.95, Rotten=0.60) × mid_price = final_price. Recommendation logic: High price → SELL; Medium + confidence≥0.75 → SELL; else HOLD. Rotten → DO NOT SELL override.
**Output**: `final_recommendation`, `final_price`, `quality_adjustment_factor`
**Status logic**: SUCCESS if Node 2 succeeded, SKIPPED otherwise

### Node 9: HOLD_STRATEGY
**Input**: recommendation, prediction_label, freshness, crop_hint
**Process**: `_build_hold_plan()` → hold_days (Low=7, Medium=4, High=1); `_storage_for(crop_hint)` → crop-specific storage instructions
**Output**: `hold_decision` (YES/NO), `days_to_hold`, `storage_method`
**Status logic**: SUCCESS if Node 2 succeeded, SKIPPED otherwise

---

## Production Readiness Evaluation

### Logging
**Rating: GOOD**

- Structured JSON logging via `logger.py` in both services
- Request middleware logs method, path, status, duration, request_id
- Model loading events logged with metadata
- `X-Request-ID` and `X-Response-Time-Ms` response headers

**Gap**: No log aggregation configured. Logs go to stdout only. No centralized log storage.

### Monitoring
**Rating: POOR**

- No metrics endpoint (no Prometheus `/metrics`)
- No health check that validates model inference (only checks if models are loaded)
- No alerting on inference errors
- No latency percentile tracking
- `latency_ms` is returned per-request but never aggregated

### Input Validation
**Rating: GOOD (better than audit claimed)**

- `PredictRequest` Pydantic model with `Field` bounds and `@model_validator`
- Image upload: content-type whitelist, 10MB size limit, empty file check
- `ModelType` Literal restricts model selection to valid values

**Gap**: No rate limiting on any endpoint. A single client can flood the inference server.

### Scalability
**Rating: POOR**

- Single uvicorn worker by default
- `threading.RLock()` serializes concurrent inference requests
- TensorFlow model inference is not thread-safe without careful management — the `_lock` in `predict.py` mitigates this but at the cost of throughput
- No request queuing or backpressure mechanism
- Image pipeline blocks the event loop during inference

### Docker Readiness
**Rating: PARTIAL**

- `start.bat` and `start.sh` scripts exist for local startup
- No `Dockerfile` or `docker-compose.yml` found in directory listing
- No containerization configuration

### Cloud Readiness
**Rating: POOR**

- No environment-specific configuration (dev/staging/prod)
- CORS `allow_origins=["*"]` must be restricted
- No secrets management (API keys in `.env` files)
- No health check endpoint suitable for load balancer probes (the `/health` endpoint exists but returns 200 even if models are degraded)

### API Robustness
**Rating: GOOD**

- All routes have try/except with appropriate HTTP status codes (422, 503, 500)
- `Promise.allSettled()` in frontend ensures one model failure doesn't block others
- Graceful degradation: if CNN fails to load, `/predict-image` returns 503 but `/predict` still works

### Security Risks

**1. Unrestricted File Upload**
`POST /predict-image` and `POST /smart-decision` accept image uploads. Content-type and size are validated, but:
- No virus/malware scanning
- No path traversal protection (images are processed in memory, not saved — low risk)
- No authentication — any client can upload images

**2. CORS Wildcard**
`allow_origins=["*"]` in both services. Acceptable for development, unacceptable for production.

**3. No Authentication**
All endpoints are publicly accessible. No API key, JWT, or session required. Any client on the network can call `/predict` or `/smart-decision`.

**4. No Rate Limiting**
No rate limiting on any endpoint. Inference endpoints are computationally expensive (TensorFlow inference). A single malicious client can exhaust server resources.

**5. Prompt Injection Risk (Voice Service)**
The voice service passes user audio transcription directly to the LLM. The system prompt has safety constraints, but a sophisticated prompt injection attack could potentially bypass them. The `llm_max_tokens=320` limit reduces the attack surface.

**6. Exposed API Keys**
API keys are stored in `.env` files. If `.env` is accidentally committed to git, keys are exposed. The `.gitignore` should exclude `.env` files — this should be verified.

**7. DuckDuckGo API**
The market data module makes outbound HTTP requests to `api.duckduckgo.com`. In a production environment, outbound HTTP from the inference server should be controlled and audited.

### Model Versioning
**Rating: POOR**

- File mtime used as version identifier — not a real versioning system
- No model registry (MLflow, W&B, etc.)
- No rollback capability
- Replacing a `.pkl` or `.h5` file immediately changes production behavior with no audit trail

### Retry Handling
**Rating: PARTIAL**

- Voice service has fallback provider logic (primary → fallback on rate limit)
- Main backend has no retry logic for any operation
- DuckDuckGo API has a 4s timeout but no retry

### Performance Risks

**1. Startup Latency**
All models loaded synchronously at startup. TensorFlow loads `ann_model.h5`, `dnn_model.h5`, `fruit_classifier.h5`, `cnn_food_quality_model.h5` — four Keras models. On CPU, this can take 10–30 seconds. The server is unavailable during this window.

**2. Inference Bottleneck**
TensorFlow inference on CPU for 4 Keras models is slow. The `_lock` in `predict.py` means concurrent requests queue behind each other. Under load, response times will degrade linearly.

**3. Memory Usage**
Four Keras models + YOLOv8 + sklearn models all loaded simultaneously. Estimated memory: 500MB–1.5GB depending on model sizes. On a low-memory server, this will cause OOM errors.

**4. YOLO Startup**
YOLOv8 loads `yolov8n.pt` at startup. The `.ultralytics/` directory in the backend confirms local caching is configured, so internet download is not required on subsequent starts.

**5. Image Processing**
`cv2.imdecode()` + `cv2.resize()` + numpy operations are CPU-bound. For large images (up to 10MB), this adds latency before model inference even begins.
