# AgriIntel — Current Project State
> Last updated: May 2026

---

## What This Project Is

AgriIntel is an AI-powered agricultural market intelligence dashboard. Farmers and traders upload a crop image and/or enter price data to get a SELL / HOLD / DO NOT SELL recommendation backed by a Random Forest model and a CNN food quality classifier.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v3, Framer Motion, Recharts, React Router v7 |
| Backend | FastAPI, scikit-learn, TensorFlow/Keras, joblib, httpx |
| ML — Price | Random Forest (2-feature: min_price, max_price) |
| ML — Image | CNN (128×128 RGB → Fresh / Rotten) |
| AI Chat | Groq API (LLaMA 3.3 70B, free tier) |
| i18n | Custom React context (English / Hindi / Marathi) |

---

## Running the Project

```bat
start.bat          # Windows — opens two terminal windows
```

```bash
./start.sh         # Git Bash / WSL
```

Or manually:
```bash
# Backend (port 8000)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` (defaults to `http://localhost:8000`).
Set Groq API key in `frontend/src/pages/AIAssistant.jsx` line 9.

---

## Backend — Files & Endpoints

```
backend/
├── main.py            # FastAPI app, routes, CORS, request logging
├── predict.py         # Thread-safe RF/ANN/GB registry + 2-feature inference
├── predict_image.py   # CNN freshness inference (128×128)
├── smart_decision.py  # Pipeline: CNN → web price fetch → ML → generative text
├── intelligence.py    # Confidence, price_range_analysis, market_insight
├── market_data.py     # DuckDuckGo price fetch + hardcoded fallbacks
├── generative.py      # Rule-based AI narrative paragraph
├── schemas.py         # Pydantic v2 models
├── config.py          # pydantic-settings (.env support)
├── logger.py          # JSON structured logging
└── models/
    ├── crop_model.pkl              ✅ Random Forest (2-feature, ACTIVE)
    ├── scaler.pkl                  ✅ StandardScaler (2-feature, ACTIVE)
    ├── features.pkl                ✅ Feature names list (present, unused by API)
    └── cnn_food_quality_model.h5   ✅ CNN freshness classifier (ACTIVE)
```

### Endpoints

| Method | Route | Status | Description |
|--------|-------|--------|-------------|
| GET | `/health` | ✅ | App version, loaded models |
| POST | `/predict` | ✅ | Price-based SELL/HOLD — input: min_price, max_price |
| POST | `/predict-image` | ✅ | CNN freshness — input: image file |
| POST | `/smart-decision` | ✅ | Full pipeline — input: image + optional crop name |

### `/predict` Response
```json
{
  "model_used": "random_forest",
  "model_version": "1776534655",
  "prediction": 1,
  "recommendation": "SELL",
  "confidence": 0.97,
  "price_range_analysis": "High price spread indicates strong demand.",
  "market_insight": "Strong demand spread — favorable conditions for immediate selling.",
  "latency_ms": 3.41
}
```

### `/smart-decision` Response
```json
{
  "freshness": "Fresh",
  "confidence": 0.9823,
  "recommendation": "SELL",
  "estimated_min_price": 2100.0,
  "estimated_max_price": 2800.0,
  "price_source": "dataset_median",
  "market_insight": "...",
  "price_range_analysis": "...",
  "ml_model_used": "random_forest",
  "generated_analysis": "Visual inspection by the CNN model confirms...",
  "latency_ms": 58.3
}
```

### Model Details

| Model | File | Features | Output | Status |
|-------|------|----------|--------|--------|
| Random Forest | `crop_model.pkl` | min_price, max_price | 0=HOLD, 1=SELL | ✅ Active |
| StandardScaler | `scaler.pkl` | fits 2 features | scaled array | ✅ Active |
| CNN Freshness | `cnn_food_quality_model.h5` | 128×128 RGB image | Fresh / Rotten (softmax) | ✅ Active |
| Gradient Boosting | `gb_model.pkl` | — | — | ❌ Missing |
| ANN | `ann_model.pkl` | — | — | ❌ Missing |

Training data: `dataset/crop_prices.csv` (8,578 rows)
Label: `modal_price >= median` → 1 (SELL), else 0 (HOLD)

---

## Frontend — Pages & Integration

| Route | Page | Backend | Data |
|-------|------|---------|------|
| `/` | Dashboard | ✅ `/predict-image` | Charts: static |
| `/sell-timing` | Sell Timing | ✅ `/predict` | Intraday chart: static |
| `/smart-decision` | Smart Decision | ✅ `/smart-decision` | Fully live |
| `/crop-recommendation` | Crop Recommendation | ❌ None | Mock function |
| `/market-intelligence` | Market Intelligence | ❌ None | Static hardcoded |
| `/model-performance` | Model Performance | ✅ `/predict` + `/predict-image` | Benchmark chart: static |
| `/ai-assistant` | AI Assistant | ✅ Groq API (direct) | Live chat |

### API Service (`frontend/src/services/api.js`)

| Function | Endpoint |
|----------|----------|
| `fetchPrediction(min, max)` | `POST /predict` |
| `fetchPredictImage(file)` | `POST /predict-image` |
| `fetchSmartDecision(file, cropHint)` | `POST /smart-decision` |
| `fetchPredictionWithModel(min, max, model_type)` | `POST /predict?model_type=...` |

Base URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:8000'`

### i18n

Language selector (EN / HI / MR) in the Navbar. Translations live in `frontend/src/context/LanguageContext.jsx`. `CardTitle` and `CardDescription` auto-translate. Pages use `useTranslate()` hook for inline strings.

---

## What Is Not Done / Known Gaps

| Item | Status |
|------|--------|
| Gradient Boosting model | ❌ `gb_model.pkl` missing — UI references it, returns 422 |
| ANN model | ❌ `ann_model.pkl` missing |
| `features.pkl` | Present but unused by the API |
| CropRecommendation backend | ❌ Uses local mock `createRecommendation()` function |
| Dashboard / MarketIntelligence charts | ❌ Hardcoded static data |
| Authentication | ❌ No auth on any endpoint |
| Rate limiting | ❌ No throttling |
| Tests | ❌ None written |
| Docker | ❌ No Dockerfile or docker-compose |
| Prediction persistence | ❌ Logged to stdout only, not stored |
| Backend `.env.example` | ❌ Not created |
| SmartDecision nav link | ✅ Exists in sidebar |
| DuckDuckGo price fetch | ⚠️ Rarely returns usable data — almost always falls back to hardcoded medians |

---

## Smart Decision Pipeline

```
User uploads image + optional crop name
        │
        ▼
1. CNN (cnn_food_quality_model.h5)
   → freshness: Fresh / Rotten
   → confidence: 0.0–1.0
        │
        ▼
2. market_data.py
   → DuckDuckGo API query: "{crop} crop price per quintal India today"
   → Falls back to hardcoded medians if no price found
   → estimated_min_price, estimated_max_price, price_source
        │
        ▼
3. predict.py (Random Forest)
   → Input: estimated_min_price, estimated_max_price
   → Output: SELL / HOLD + confidence + market_insight
        │
        ▼
4. Decision rule
   → Rotten → "DO NOT SELL" (overrides ML)
   → Fresh  → use ML recommendation
        │
        ▼
5. generative.py
   → Assembles 7-sentence AI narrative from sentence banks
   → generated_analysis field in response
```

---

## AI Assistant

- Route: `/ai-assistant`
- Model: `llama-3.3-70b-versatile` via Groq API (free tier, `gsk_` key)
- API key hardcoded in `frontend/src/pages/AIAssistant.jsx` line 9
- Supports text chat + image attachment (image described as text context — Groq free tier is text-only)
- System prompt scopes responses to agricultural market intelligence

---

## Notebooks

| File | Purpose |
|------|---------|
| `Notebooks/MDM_crop_prices_.ipynb` | Original notebook (older) |
| `Notebooks/Updated_MDM_crop_prices.ipynb` | Current training notebook |

Training produces: `crop_model.pkl`, `scaler.pkl`, `features.pkl`, `cnn_food_quality_model.h5`
