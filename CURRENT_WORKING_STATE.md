# Current Working State — AgriIntel AI Dashboard

> Last updated: April 18, 2026
> Stack: React 19 + Vite (frontend) · FastAPI + scikit-learn + TensorFlow (backend) · Random Forest + CNN ML models

---

## Project Overview

AgriIntel is an AI-powered agricultural market intelligence dashboard. It helps farmers and traders decide when to sell crops by analyzing price data and crop image quality through ML models. The system has a React frontend, a FastAPI backend, a Random Forest price prediction model, and a CNN food quality classifier.

---

## Repository Structure

```
/
├── frontend/                  # React + Vite + Tailwind UI
│   ├── .env.example           # Environment variable template
│   └── src/
│       ├── pages/             # 6 route pages
│       ├── components/        # UI + UX components
│       ├── hooks/             # useAiLoading
│       ├── services/          # api.js (fetch layer)
│       └── lib/               # utils (cn)
│
├── backend/                   # FastAPI server
│   ├── main.py                # App entry, routes, middleware
│   ├── predict.py             # Thread-safe price model registry + inference
│   ├── predict_image.py       # Thread-safe CNN loader + inference
│   ├── smart_decision.py      # Combined freshness + price decision engine
│   ├── intelligence.py        # Confidence, analysis, insight enrichment
│   ├── schemas.py             # Pydantic request/response models
│   ├── config.py              # Settings via pydantic-settings
│   ├── logger.py              # JSON structured logger
│   ├── requirements.txt
│   └── models/
│       ├── crop_model.pkl              # Trained Random Forest (ACTIVE)
│       ├── scaler.pkl                  # Feature scaler (ACTIVE)
│       ├── features.pkl                # Feature names (present, unused)
│       ├── cnn_food_quality_model.h5   # CNN food quality classifier (ACTIVE)
│       ├── gb_model.pkl                # Gradient Boosting (MISSING)
│       └── ann_model.pkl               # ANN (MISSING)
│
├── dataset/
│   └── crop_prices.csv        # Source training data
│
└── docs/
    └── perceptron_and_NN.pdf  # Reference material
```

---

## Backend — What Is Done

### Core API (`main.py`)
- FastAPI app with `lifespan` context manager — loads all ML artifacts at startup
- CORS middleware enabled (`allow_origins=["*"]`)
- HTTP request logging middleware — logs method, path, status, duration per request
- `X-Request-ID` and `X-Response-Time-Ms` injected into every response header
- Error mapping: `ValueError` → 422, `RuntimeError` → 503, unknown → 500
- CNN load failure at startup is a warning, not a crash — rest of API stays up

### Endpoints
| Method | Route | Status | Description |
|--------|-------|--------|-------------|
| GET | `/health` | ✅ Done | App version, loaded price models + CNN model metadata |
| POST | `/predict` | ✅ Done | Price-based SELL/HOLD with full intelligence enrichment |
| POST | `/predict-image` | ✅ Done | CNN freshness classification from uploaded image |
| POST | `/smart-decision` | ✅ Done | Combined CNN + price ML → final SELL/HOLD/DO NOT SELL |

### Price Prediction Engine (`predict.py`)
- Thread-safe model registry using `threading.RLock`
- Models loaded once at startup; local refs taken inside lock for zero-contention inference
- Model versioning via file `mtime`
- `model_type` query param: `random_forest | gradient_boosting | ann | best`
- `"best"` alias resolves to `default_model` from config (currently `random_forest`)
- Graceful degradation: missing `.pkl` files skipped with warning, not a crash
- `latency_ms` via `time.perf_counter()` returned in every response

### CNN Image Prediction (`predict_image.py`)
- Same `RLock` thread-safety pattern as `predict.py`
- TensorFlow imported lazily inside `load_cnn()` — no import cost if file is absent
- Input: any image → PIL decode → RGB convert → resize 128×128 → normalize `/255.0`
- Output: `Fresh` (class 0) or `Rotten` (class 1) with softmax confidence
- File validation: JPEG/PNG/WEBP/BMP only, 10 MB max, empty file rejected

### Smart Decision Engine (`smart_decision.py`)
- Runs CNN first, then price ML — sequential, no cross-lock contention
- Decision rule: `Rotten` → `"DO NOT SELL"` regardless of market signal; `Fresh` → use ML recommendation
- `final_decision_reason` composed from freshness + market insight templates
- All combination logic isolated here, route handler stays thin

### Intelligence Layer (`intelligence.py`)
- Spread-tier system: `tight / moderate / wide / very_wide` based on `(max−min)/mid`
- `confidence`: uses `predict_proba` when available (RF, GB), spread heuristic fallback for ANN
- `price_range_analysis`: human-readable spread characterization
- `market_insight`: actionable sentence from 8 combinations of prediction × spread tier

### Schemas (`schemas.py`)
- `PredictRequest`: Pydantic v2 with `gt`/`le` bounds + `@model_validator` for `min > max`
- `PredictResponse`: full enriched price prediction shape
- `ImagePredictResponse`: freshness + confidence + version + latency
- `SmartDecisionResponse`: combined freshness + recommendation + insight + reason
- `HealthResponse`: includes optional `cnn_model` field

### Config & Logging
- `config.py`: `pydantic-settings`, reads from `.env`, all price bounds and defaults centralized
- `logger.py`: JSON structured logging via `python-json-logger`, per-module loggers

### Response Shapes

`POST /predict`
```json
{
  "model_used": "random_forest",
  "model_version": "1713456789",
  "prediction": 1,
  "recommendation": "SELL",
  "confidence": 0.97,
  "price_range_analysis": "High price spread indicates strong demand.",
  "market_insight": "Strong demand spread — favorable conditions for immediate selling.",
  "latency_ms": 3.41
}
```

`POST /predict-image`
```json
{
  "freshness": "Fresh",
  "confidence": 0.9823,
  "model_version": "1713456789",
  "latency_ms": 42.1
}
```

`POST /smart-decision`
```json
{
  "freshness": "Fresh",
  "confidence": 0.9823,
  "recommendation": "SELL",
  "market_insight": "Strong demand spread — favorable conditions for immediate selling.",
  "price_range_analysis": "High price spread indicates strong demand.",
  "ml_model_used": "random_forest",
  "final_decision_reason": "Crop is Fresh and market conditions are favorable...",
  "latency_ms": 58.3
}
```

---

## Backend — What Is Remaining / Not Done

| Item | Status | Notes |
|------|--------|-------|
| Gradient Boosting model | ❌ Missing | `gb_model.pkl` absent — route accepts it but returns 422 |
| ANN model | ❌ Missing | `ann_model.pkl` absent — same as above |
| `features.pkl` usage | ❌ Unused | On disk but never read by the API |
| Authentication / API keys | ❌ Not done | No auth on any endpoint |
| Rate limiting | ❌ Not done | No throttling on any route |
| Tests | ❌ None | No unit or integration tests |
| Docker / deployment config | ❌ None | No `Dockerfile` or `docker-compose.yml` |
| Database / prediction logging | ❌ None | Predictions logged to stdout only, not persisted |
| Backend `.env` file | ❌ Not created | `config.py` has defaults; no `.env.example` for backend |

---

## Frontend — What Is Done

### Tech Stack
- React 19, Vite 8, React Router v7, Tailwind CSS v3
- Framer Motion for animations, Recharts for all charts
- Custom dark theme (deep navy/slate palette with neon cyan accents)

### Routing (`App.jsx`)
| Route | Page | Backend Connected | Status |
|-------|------|-------------------|--------|
| `/` | Dashboard | ❌ | Static/hardcoded |
| `/crop-recommendation` | CropRecommendation | ❌ | Mock logic |
| `/sell-timing` | SellTiming | ✅ `/predict` | Fully integrated |
| `/market-intelligence` | MarketIntelligence | ❌ | Static data |
| `/model-performance` | ModelPerformance | ❌ | Static data |
| `/smart-decision` | SmartDecision | ✅ `/smart-decision` | Fully integrated |
| `*` | Redirect to `/` | — | Done |

### Pages Detail

**Dashboard** (`Dashboard.jsx`)
- AI summary card, sell recommendation badge, price trend chart, cluster bar chart, quick stats
- Status: all static/hardcoded, no backend connection

**SellTiming** (`SellTiming.jsx`) — integrated with `/predict`
- Intraday price trend chart with best/worst sell window reference areas
- Live Prediction card wired to `POST /predict`:
  - Min/max price inputs with client-side validation
  - Loading spinner, error banner
  - Result grid: recommendation badge · raw output · confidence (%) · market insight · price range analysis · model name + version + latency

**CropRecommendation** (`CropRecommendation.jsx`)
- State / Market / Crop dropdowns, result card
- Status: fully mock — `createRecommendation()` local function, no backend call

**MarketIntelligence** (`MarketIntelligence.jsx`)
- Scatter chart, cluster legend, interpretation cards
- Status: fully static hardcoded data

**ModelPerformance** (`ModelPerformance.jsx`)
- Accuracy bar chart for 5 models, best model card, insight cards
- Status: fully static hardcoded data

**SmartDecision** (`SmartDecision.jsx`) — integrated with `/smart-decision`
- Image upload (styled file input + inline thumbnail preview)
- Min/max price inputs
- Calls `POST /smart-decision` via `fetchSmartDecision()`
- Result grid: uploaded image · freshness badge · CNN confidence · recommendation badge
- Market insight card (green highlight)
- Final decision reason card (cyan highlight)
- ExplainabilityPanel with dynamic bullets based on freshness result
- Full loading state via `AIAnalyzingOverlay` + spinner

### Shared Components
| Component | Status | Notes |
|-----------|--------|-------|
| `Card / CardHeader / CardContent / CardTitle / CardDescription` | ✅ | Reusable, consistent styling |
| `AIAnalyzingOverlay` | ✅ | Full-page animated overlay during load |
| `ExplainabilityPanel` | ✅ | Reusable 3-bullet explainability card |
| `useAiLoading(duration)` | ✅ | Simulates AI loading delay on page mount |
| `cn()` utility | ✅ | `clsx` + `tailwind-merge` wrapper |
| Layout | ✅ | Wraps all routes |

### API Service (`services/api.js`)
| Function | Endpoint | Status |
|----------|----------|--------|
| `fetchPrediction(min, max)` | `POST /predict` | ✅ Done |
| `fetchSmartDecision(file, min, max)` | `POST /smart-decision` | ✅ Done |
| `BASE_URL` | — | ✅ `VITE_API_URL` env var with `http://localhost:8000` fallback |

### Environment Config
- `frontend/.env.example` created — documents `VITE_API_URL`
- `BASE_URL` in `api.js` uses `import.meta.env.VITE_API_URL ?? 'http://localhost:8000'`
- Copy `.env.example` → `.env` and set URL for non-local deployments

---

## Frontend — What Is Remaining / Not Integrated

| Item | Status | Notes |
|------|--------|-------|
| `model_type` selector in UI | ❌ Not done | Backend supports it, no frontend control yet |
| CropRecommendation → backend | ❌ Not integrated | Still uses mock `createRecommendation()` |
| Dashboard → backend | ❌ Not integrated | All data hardcoded |
| MarketIntelligence → backend | ❌ Not integrated | All cluster data hardcoded |
| ModelPerformance → backend | ❌ Not integrated | All accuracy data hardcoded |
| `/health` endpoint consumption | ❌ Not done | No frontend status indicator |
| SmartDecision nav link | ❌ Not added | Route exists, not yet in sidebar/nav |
| Error boundary | ❌ Not done | No React error boundary wrapping routes |

---

## ML Models — State

| Model | File | Status | Used In API |
|-------|------|--------|-------------|
| Random Forest | `crop_model.pkl` | ✅ Present | ✅ Active default for `/predict`, `/smart-decision` |
| Scaler | `scaler.pkl` | ✅ Present | ✅ Used on every price prediction |
| Feature names | `features.pkl` | ✅ Present | ❌ Unused |
| CNN food quality | `cnn_food_quality_model.h5` | ✅ Present | ✅ Active for `/predict-image`, `/smart-decision` |
| Gradient Boosting | `gb_model.pkl` | ❌ Missing | ❌ Route defined, file absent |
| ANN | `ann_model.pkl` | ❌ Missing | ❌ Route defined, file absent |

### CNN Model Spec
- Input: `(None, 128, 128, 3)` float32, normalized to `[0, 1]`
- Output: `Dense(2, softmax)` — index 0 = Fresh, index 1 = Rotten
- Loss: `sparse_categorical_crossentropy`, optimizer: Adam

### Price Model Spec
- Input: `[min_price, max_price]` scaled via `scaler.pkl`
- Output: `0` (HOLD) or `1` (SELL)
- Confidence: from `predict_proba` (RF natively supports this)

---

## Integration Map — What Talks to What

```
Browser
  ├── SellTiming.jsx
  │     └── services/api.js  ──POST /predict──►  main.py
  │                                                └── predict.py
  │                                                      ├── crop_model.pkl (RF)
  │                                                      ├── scaler.pkl
  │                                                      └── intelligence.py
  │
  └── SmartDecision.jsx
        └── services/api.js  ──POST /smart-decision──►  main.py
                                                           └── smart_decision.py
                                                                 ├── predict_image.py
                                                                 │     └── cnn_food_quality_model.h5
                                                                 └── predict.py
                                                                       ├── crop_model.pkl (RF)
                                                                       ├── scaler.pkl
                                                                       └── intelligence.py

NOT connected to backend:
  ├── Dashboard.jsx           (hardcoded)
  ├── CropRecommendation.jsx  (mock function)
  ├── MarketIntelligence.jsx  (hardcoded)
  └── ModelPerformance.jsx    (hardcoded)
```

---

## Immediate Next Steps (Priority Order)

1. **Add SmartDecision to sidebar nav** — route exists at `/smart-decision` but no nav link yet.

2. **Add GB and ANN model files** — train and export `gb_model.pkl` and `ann_model.pkl` to `backend/models/`.

3. **Add `model_type` selector to SellTiming and SmartDecision** — backend supports it, frontend doesn't expose it yet.

4. **Integrate CropRecommendation with backend** — replace `createRecommendation()` mock with a real API call.

5. **Integrate `features.pkl`** — use stored feature names for input validation or feature ordering in `predict.py`.

6. **Add tests** — unit tests for `intelligence.py`, `smart_decision.py`, `predict_image.py`; integration test for `/smart-decision`.

7. **Create backend `.env.example`** — document `app_version`, `default_model`, `log_level`, price bounds.

8. **Add Docker support** — `Dockerfile` for backend, `docker-compose.yml` for full stack.

9. **Add auth** — API key or JWT on all prediction endpoints before any public deployment.

10. **Persist predictions** — log to a database (SQLite for dev, Postgres for prod) for audit trail and analytics.
