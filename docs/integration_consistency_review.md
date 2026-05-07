# Integration Consistency Review

Full frontend ↔ backend ↔ model mapping with real/fake classification for every component.

---

## Master Mapping Table

| Frontend Component | Backend API | Model Used | Real or Fake? | Status |
|---|---|---|---|---|
| `Dashboard.jsx` — Crop Quality Scanner | `POST /predict-image` | `cnn_food_quality_model.h5` + `fruit_classifier.h5` + `yolov8n.pt` | **REAL** | ✅ Fully connected |
| `Dashboard.jsx` — Price Distribution chart | None | None | **FAKE** | ❌ Hardcoded 6-day static data |
| `Dashboard.jsx` — Model Accuracy chart | None | None | **FAKE** | ❌ Hardcoded values including DNN 99.1% (actual: 63.75%) |
| `Dashboard.jsx` — Stat card "Avg Confidence 97.3%" | None | None | **FAKE** | ❌ Hardcoded string, never computed |
| `Dashboard.jsx` — Stat card "Total Predictions —" | None | None | **PARTIAL** | ⚠️ Placeholder dash, no session counter |
| `SellTiming.jsx` — Intraday Price Trend chart | None | None | **FAKE** | ❌ Hardcoded 12-hour price series |
| `SellTiming.jsx` — Best/Worst Sell Window | None | None | **FAKE** | ❌ Hardcoded 10:00–13:00 window |
| `SellTiming.jsx` — SELL signal 91% confidence | None | None | **FAKE** | ❌ Hardcoded recommendation object |
| `SellTiming.jsx` — Live Prediction panel | `POST /predict` | `crop_price_classifier.pkl` (RF default) | **REAL** | ✅ Fully connected |
| `CropRecommendation.jsx` — Analyze Recommendation | None | None | **FAKE** | ❌ `createRecommendation()` is string-length arithmetic |
| `CropRecommendation.jsx` — Confidence score | None | None | **FAKE** | ❌ `Math.min(96, 72 + market.length % 3 * 6 + ...)` |
| `MarketIntelligence.jsx` — Cluster Scatter chart | None | None | **FAKE** | ❌ 20 hardcoded data points, 4 fictional clusters |
| `MarketIntelligence.jsx` — Cluster Legend | None | None | **FAKE** | ❌ Hardcoded centroids and labels |
| `ModelPerformance.jsx` — Model Accuracy Benchmark chart | None | None | **FAKE** | ❌ Static data, DNN 99.1% fabricated |
| `ModelPerformance.jsx` — Live Model Comparison | `POST /predict?model_type=X` | RF, GB (broken), ANN | **PARTIAL** | ⚠️ RF+ANN work; GB always 422 errors |
| `ModelPerformance.jsx` — CNN Freshness Scanner | `POST /predict-image` | `cnn_food_quality_model.h5` | **REAL** | ✅ Fully connected |
| `SmartDecision.jsx` — Full pipeline | `POST /smart-decision` | All models (RF/ANN/DNN + KMeans + CNNs + YOLO) | **REAL** | ✅ Fully connected, 9-node graph |
| `VoiceAssistant.jsx` — Voice chat | `POST /voice-chat` (port 8001) | Groq Whisper + LLaMA 3.3 70B + HuggingFace TTS | **REAL** | ✅ Fully connected (requires API keys) |

---

## Detailed Component Analysis

### Dashboard.jsx

**Real integrations**: 1 (image scanner)
**Fake/static**: 4 (price chart, accuracy chart, avg confidence, sell window)

The Dashboard presents itself as a live system health monitor but is predominantly static. The "Avg Confidence 97.3%" stat card is hardcoded in the `statCards` array — it never reads from any API. The model accuracy bar chart duplicates the fabricated DNN 99.1% value from `ModelPerformance.jsx`. The price distribution line chart uses 6 hardcoded Mon–Sat data points with no data source.

The image scanner is genuinely connected: `handleScan()` calls `fetchPredictImage(imageFile)` → `POST /predict-image` → `cnn_food_quality_model.h5`. The response fields `freshness`, `confidence`, `model_version`, `latency_ms` are all rendered from the real API response.

**Confidence**: High — code directly read and verified.

---

### SellTiming.jsx

**Real integrations**: 1 (live prediction panel)
**Fake/static**: 3 (intraday chart, best/worst window, static recommendation)

The intraday price trend chart uses a hardcoded `priceSeries` array with 12 hourly price points (1780 to 1935 INR). The best sell window (10:00–13:00) and worst window (06:00–08:00) are hardcoded constants. The "SELL 91%" recommendation card is a hardcoded object.

The live prediction panel is real: `handlePredict()` calls `fetchPrediction(min, max)` → `POST /predict` → RF model. The response fields `recommendation`, `prediction`, `confidence`, `market_insight`, `price_range_analysis`, `model_used`, `model_version`, `latency_ms` are all rendered from the real API response.

**Critical issue**: The page title is "Sell Timing" and the intraday chart implies time-series price forecasting capability. The system has no time-series model (no LSTM, no ARIMA). The chart is decorative fiction presented as AI output.

**Confidence**: High — code directly read and verified.

---

### CropRecommendation.jsx

**Real integrations**: 0
**Fake/static**: All

This is the most egregious fake in the entire system. The `createRecommendation(state, market, crop)` function:

```javascript
const marketScore = market.length % 3        // string length modulo
const cropBoost = crop ? crop.length % 2 : 1 // string length modulo
const stateBias = state.length % 4           // string length modulo
const confidence = Math.min(96, 72 + marketScore * 6 + cropBoost * 5 + stateBias * 3)
```

This is pure string-length arithmetic. "Ludhiana Mandi" (14 chars) always produces the same confidence regardless of actual market conditions. The function has three hardcoded output branches (High/Medium/Low) with fixed price ranges (INR 2350–2780, INR 1980–2280, INR 1520–1880) that never change.

The page has an AI loading overlay, an "AI analyzing..." button state, and an ExplainabilityPanel with bullets claiming "model consensus across scoring heads" — none of which exist. This is UI theater.

**Confidence**: High — code directly read and verified.

---

### MarketIntelligence.jsx

**Real integrations**: 0
**Fake/static**: All

The scatter chart uses 20 hardcoded data points across 4 fictional clusters: "Low Price", "Stable", "High Demand", "Volatile". The actual KMeans model has k=9 clusters. The 4 clusters shown do not correspond to any real model output.

The cluster centroids shown ("Demand 22, Price 1480", etc.) are invented. The actual KMeans model operates on a 9-dimensional feature space (not 2D demand vs price). The "Demand Index" axis does not exist as a feature in the dataset — the dataset has min_price, max_price, and categorical location/commodity features.

The page claims "Clusters are derived from a feature space combining demand index, modal price, and intraday spread variability" — this is false. The actual features are state, district, market, commodity, variety, grade, arrival_date, min_price, max_price.

**Confidence**: High — code directly read and verified.

---

### ModelPerformance.jsx

**Real integrations**: 2 (live comparison, CNN scanner)
**Fake/static**: 1 (benchmark chart)

The static benchmark chart (`modelData` array) shows:
- Random Forest: 96.8% (actual notebook: 99.71% — **UNDERSTATED**)
- Gradient Boosting: 97.5% (actual notebook: 99.71% — **UNDERSTATED**)
- ANN: 98.2% (actual notebook: 99.53% — **UNDERSTATED**)
- DNN: 99.1% (actual notebook: 63.75% — **FABRICATED, OVERSTATED BY 35.35 PERCENTAGE POINTS**)
- SVM: 95.9% (actual notebook: 97.61% — **UNDERSTATED**)

Every single value in the static chart is wrong. RF, GB, ANN, SVM are all understated (possibly to make DNN appear as the "best" model). DNN is massively overstated.

The live comparison panel is real but broken for GB: `fetchPredictionWithModel(min, max, "gradient_boosting")` sends `model_type=gradient_boosting` to the backend, which rejects it with HTTP 422 because `gradient_boosting` is not in the `ModelType` Literal in `schemas.py`.

The CNN scanner is fully real and functional.

**Confidence**: High — code directly read and verified.

---

### SmartDecision.jsx

**Real integrations**: All
**Fake/static**: 0

This is the only page that is entirely real. `fetchSmartDecision(imageFile, cropHint)` → `POST /smart-decision` → full 9-node pipeline. Every field rendered in the UI (`recommendation`, `freshness`, `confidence`, `cluster_id`, `price_probabilities`, `feature_context`, `feature_contributions`, `node_graph`, `stage_explanations`, `generated_analysis`) comes from the real API response.

The 9-node workflow graph is rendered from `result.node_graph.nodes` — a real data structure built by `smart_decision.py` from actual model outputs.

The only caveat: `generated_analysis` is produced by `generative.py` which is a simple string concatenation of reasoning strings, not an LLM. The field name implies generative AI but the implementation is deterministic string joining.

**Confidence**: High — code directly read and verified.

---

### VoiceAssistant.jsx

**Real integrations**: All (requires API keys)
**Fake/static**: 0

Fully connected to the voice microservice on port 8001. The `api.js` functions `fetchVoiceHealth()`, `fetchVoiceChat()`, `fetchVoiceReply()`, `fetchVoiceSynthesis()` all make real HTTP calls. The orchestrator chains Groq STT → OpenRouter LLM → HuggingFace TTS with fallback providers.

Non-functional without `.env` configuration (API keys required). The `.env.example` file exists at `backend/voice-to-voice/.env.example`.

**Confidence**: High — code directly read and verified.

---

## Backend Routes vs Frontend Usage

| Backend Route | Used By Frontend? | Notes |
|---|---|---|
| `GET /health` | No direct UI call | Not called from any frontend page |
| `POST /predict` | `SellTiming.jsx`, `ModelPerformance.jsx` | ✅ Used |
| `POST /predict-image` | `Dashboard.jsx`, `ModelPerformance.jsx` | ✅ Used |
| `POST /smart-decision` | `SmartDecision.jsx` | ✅ Used |
| `GET /providers/{stage}` (voice) | No | Unused by frontend |
| `POST /transcribe` (voice) | No direct call | `VoiceAssistant.jsx` uses `/voice-chat` which internally calls transcribe |
| `POST /generate` (voice) | `api.js` `fetchVoiceReply()` | Defined but unclear if VoiceAssistant.jsx calls it directly |
| `POST /synthesize` (voice) | `api.js` `fetchVoiceSynthesis()` | Defined but unclear if VoiceAssistant.jsx calls it directly |
| `POST /voice-chat` (voice) | `VoiceAssistant.jsx` | ✅ Used |
| `WS /ws/voice-chat` (voice) | `VoiceAssistant.jsx` | ✅ Used (streaming) |

**Unused backend capability**: `GET /health` returns full model registry info including loaded models, versions, and CNN status — this is never displayed in any frontend page. A system health dashboard panel would be trivial to add and would replace the hardcoded stat cards.

---

## Static Charts Pretending to Be Dynamic

| Chart | Location | Fake Data | What It Should Show |
|---|---|---|---|
| Price Distribution (Mon–Sat) | `Dashboard.jsx` | 6 hardcoded price points | Real mandi price trends from dataset |
| Model Accuracy Benchmark | `Dashboard.jsx` + `ModelPerformance.jsx` | All values wrong | Actual notebook test accuracies |
| Intraday Price Trend | `SellTiming.jsx` | 12 hardcoded hourly prices | Would require time-series model (none exists) |
| Cluster Scatter | `MarketIntelligence.jsx` | 20 hardcoded points, 4 fictional clusters | Real KMeans cluster assignments from `/predict` |
| Avg Confidence 97.3% | `Dashboard.jsx` stat card | Hardcoded string | Rolling average of real `/predict` confidence values |

---

## Summary

| Category | Count |
|---|---|
| Fully real integrations | 5 (SmartDecision, VoiceAssistant, SellTiming live panel, ModelPerformance live comparison + CNN scanner, Dashboard image scanner) |
| Partially real (some static, some live) | 3 (Dashboard, SellTiming, ModelPerformance) |
| Entirely fake/static | 2 (CropRecommendation, MarketIntelligence) |
| Backend routes unused by frontend | 2 (`/health`, `/providers/{stage}`) |
| Fabricated metrics in UI | 6 (DNN 99.1% ×2, RF 96.8%, GB 97.5%, ANN 98.2%, SVM 95.9%, Avg Confidence 97.3%) |
