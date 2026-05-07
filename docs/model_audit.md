# Model Audit — AgriIntel AI Dashboard

Deep per-model audit covering implementation, evaluation, integration, dashboard mapping, code quality, and production readiness.

---

## 1. Random Forest Classifier

**File**: `backend/models/crop_price_classifier.pkl`
**Trained in**: `Notebooks/Updated_MDM_crop_prices.ipynb` Section 3

### Implementation
- Algorithm: `sklearn.ensemble.RandomForestClassifier`
- Features: 9 (state, district, market, commodity, variety, grade, arrival_date, min_price, max_price)
- Target: 3-class modal_price label (Low / Medium / High)
- Preprocessing: LabelEncoder per categorical column, StandardScaler on numerics

### Evaluation (Notebook)
| Metric | Value |
|---|---|
| Test Accuracy | 99.71% |
| F1 Score (macro) | ~0.997 |
| Precision / Recall | Near-perfect across all 3 classes |

### Integration
- Loaded in `backend/predict.py` via `ModelRegistry` (thread-safe singleton)
- Active inference path: `POST /predict` with `model_type=random_forest`
- Default model per `backend/config.py` (`default_model=random_forest`)
- Feature contributions computed per prediction (manual importance extraction)

### Dashboard Mapping
- `ModelPerformance.jsx` — live RF vs ANN comparison (working)
- `SmartDecision.jsx` — RF is the price prediction node in the 9-node graph
- `Dashboard.jsx` — referenced in static summary cards

### Code Quality
- ✅ Thread-safe registry pattern
- ✅ Graceful error handling in inference path
- ✅ Feature contribution output enriches explainability panel
- ⚠️ No input validation schema — malformed requests reach model directly

### Production Readiness
**Rating: HIGH**
Best-performing model, fully deployed, default inference path, explainability output present. Only gap is input validation.

---

## 2. ANN (Artificial Neural Network)

**File**: `backend/models/ann_model.h5`
**Trained in**: `Notebooks/Updated_MDM_crop_prices.ipynb` Section 5

### Implementation
- Framework: Keras (TensorFlow backend)
- Architecture: Dense(128, ReLU) → Dropout(0.3) → Dense(64, ReLU) → Dropout(0.3) → Dense(32, ReLU) → Dense(3, Softmax)
- Optimizer: Adam
- Callbacks: ReduceLROnPlateau
- Epochs: 100

### Evaluation (Notebook)
| Metric | Value |
|---|---|
| Test Accuracy | 99.53% (Updated notebook) |
| Test Accuracy | 99.65% (Original notebook) |

### Integration
- Loaded in `backend/predict.py` via `ModelRegistry`
- Active inference path: `POST /predict` with `model_type=ann`
- Same 9-feature pipeline as RF

### Dashboard Mapping
- `ModelPerformance.jsx` — live ANN vs RF comparison (working)
- `SmartDecision.jsx` — selectable model in price prediction node

### Code Quality
- ✅ Loaded once at startup via lifespan event
- ✅ Shared scaler/encoders ensure consistent preprocessing
- ⚠️ No model versioning — `.h5` file replaced silently breaks inference

### Production Readiness
**Rating: HIGH**
Near-identical accuracy to RF, fully deployed, live comparison working. Minor versioning concern.

---

## 3. DNN (Deep Neural Network)

**File**: `backend/models/dnn_model.h5`
**Trained in**: `Notebooks/Updated_MDM_crop_prices.ipynb` Section 6

### Implementation
- Framework: Keras
- Architecture: Dense(256) → BatchNorm → Dropout(0.4) → Dense(128) → BatchNorm → Dropout(0.4) → Dense(64) → BatchNorm → Dropout(0.3) → Dense(32) → BatchNorm → Dense(16) → Dense(3, Softmax)
- Optimizer: Adam
- Epochs: 150

### Evaluation (Notebook)
| Metric | Value | Source |
|---|---|---|
| Test Accuracy | 63.75% | Updated notebook (confirmed) |
| Test Accuracy | 70.40% | Original notebook (different run) |
| UI Static Chart | 99.1% | **FABRICATED — does not match either notebook** |

### Integration
- Loaded in `backend/predict.py` via `ModelRegistry`
- Active inference path: `POST /predict` with `model_type=dnn`

### Dashboard Mapping
- `ModelPerformance.jsx` static benchmark chart shows DNN at 99.1% — **critical data integrity violation**
- Not selectable in live comparison dropdown (only RF and ANN exposed)

### Code Quality
- ⚠️ Non-deterministic training — accuracy varies 63–70% across runs with no fixed seed
- ❌ Static UI chart fabricates 99.1% accuracy — misleading to any evaluator
- ⚠️ Overly deep architecture for a 3-class tabular problem; BatchNorm + Dropout stacking causes underfitting

### Production Readiness
**Rating: LOW**
Deployed but underperforming. UI misrepresents its accuracy. Non-deterministic results. Should not be used as default model.

**Fix required**: Update `ModelPerformance.jsx` static chart to show actual 63.75% value.

---

## 4. Gradient Boosting Classifier

**File**: `backend/models/gb_model.pkl` — **FILE DOES NOT EXIST**
**Trained in**: `Notebooks/Updated_MDM_crop_prices.ipynb` Section 3 (trained but not exported)

### Implementation
- Trained in notebook: `GradientBoostingClassifier`, accuracy 99.71%
- `model.save()` or `joblib.dump()` call for `gb_model.pkl` is absent from notebook

### Evaluation (Notebook)
| Metric | Value |
|---|---|
| Test Accuracy | 99.71% |

### Integration
- ❌ `backend/predict.py` has no reference to `gb_model.pkl`
- ❌ `ModelPerformance.jsx` attempts to load GB model → **always errors at runtime**

### Dashboard Mapping
- `ModelPerformance.jsx` live comparison — broken, throws error when GB selected

### Production Readiness
**Rating: ZERO — Model not exported, not deployed, causes live UI errors.**

**Fix required**: Add `joblib.dump(gb_model, 'gb_model.pkl')` to notebook, copy to `backend/models/`, add loading logic to `predict.py`.

---

## 5. KMeans Clustering

**File**: `backend/models/kmeans_model.pkl`
**Trained in**: `Notebooks/Updated_MDM_crop_prices.ipynb` Section 4

### Implementation
- Algorithm: `sklearn.cluster.KMeans`
- Optimal k: 9 (determined via elbow method + silhouette analysis)
- Silhouette Score: 0.2435

### Evaluation (Notebook)
| Metric | Value |
|---|---|
| Silhouette Score | 0.2435 |
| Inertia | Logged in notebook |
| Hierarchical Silhouette | 0.1927 (for comparison) |
| DBSCAN Silhouette | 0.3141 (best among three) |

### Integration
- Loaded in `backend/predict.py`
- Used in `backend/smart_decision.py` — cluster assignment is node 5 of 9-node pipeline
- Cluster label enriches sell/hold decision logic in `intelligence.py`

### Dashboard Mapping
- `MarketIntelligence.jsx` — **FULLY STATIC** — scatter plot uses hardcoded data, no backend call
- `SmartDecision.jsx` — cluster node shows live result from real KMeans inference

### Code Quality
- ✅ Deployed and functional in smart decision pipeline
- ❌ `MarketIntelligence.jsx` never calls the backend — cluster visualization is decorative only
- ⚠️ Silhouette score of 0.2435 indicates weak cluster separation; k=9 may be too high for 3-class price data

### Production Readiness
**Rating: MEDIUM**
Backend integration works in smart decision flow. Market Intelligence page is entirely disconnected from real cluster data.

---

## 6. Fruit Classifier CNN

**File**: `backend/models/fruit_classifier.h5`
**Source**: Pre-trained / externally sourced (not trained in project notebooks)

### Implementation
- Framework: Keras
- Input: 224×224 RGB
- Output: 20 fruit/vegetable classes
- Stage: Second stage of image pipeline (after YOLOv8 detection)

### Integration
- `backend/predict_image.py` — loaded at startup, called after YOLO bounding box crop
- `POST /predict-image` endpoint

### Dashboard Mapping
- `Dashboard.jsx` — image upload widget calls `/predict-image` (working)
- `SmartDecision.jsx` — image node is entry point of 9-node pipeline

### Code Quality
- ✅ Two-stage pipeline (detect then classify) is architecturally sound
- ⚠️ Only 4 of 10 YOLO-detectable classes overlap with fruit_classifier classes (apple, banana, orange, carrot)
- ⚠️ Mango, strawberry, tomato, grape silently fail — YOLO detects but classifier may misclassify

### Production Readiness
**Rating: MEDIUM**
Functional for supported classes. Silent failure on unsupported classes is a UX and accuracy risk.

---

## 7. Freshness CNN (Food Quality Model)

**File**: `backend/models/cnn_food_quality_model.h5`
**Source**: Pre-trained / externally sourced

### Implementation
- Framework: Keras
- Input: 128×128 RGB
- Output: Binary — Fresh / Rotten
- Stage: Third stage of image pipeline (after fruit classification)

### Integration
- `backend/predict_image.py` — called after fruit_classifier
- Result feeds into `smart_decision.py` as freshness signal for sell/hold recommendation

### Dashboard Mapping
- `Dashboard.jsx` — freshness result displayed in image analysis card
- `SmartDecision.jsx` — freshness node in pipeline graph

### Code Quality
- ✅ Clean binary output, easy to interpret
- ✅ Freshness directly informs sell timing logic (Rotten → sell immediately)
- ⚠️ No confidence threshold — low-confidence Fresh/Rotten predictions treated identically to high-confidence ones

### Production Readiness
**Rating: MEDIUM-HIGH**
Functional and well-integrated into decision pipeline. Confidence thresholding would improve reliability.

---

## 8. YOLOv8 Object Detector

**File**: Runtime download via `ultralytics` — no local `.pt` file in `backend/models/`
**Source**: `ultralytics` library default weights

### Implementation
- Model: YOLOv8 (default weights, not fine-tuned)
- Task: Fruit/vegetable bounding box detection
- Stage: First stage of image pipeline

### Integration
- `backend/predict_image.py` — `YOLO()` instantiated at startup
- Detects objects, crops bounding boxes, passes to fruit_classifier

### Code Quality
- ⚠️ Default weights not fine-tuned on agricultural produce — detection quality varies
- ⚠️ Only 4 fruit classes reliably detected (apple, banana, orange, carrot)
- ❌ No local model file — requires internet download on first run; breaks in air-gapped environments
- ⚠️ No fallback if YOLO detects zero objects — pipeline behavior undefined

### Production Readiness
**Rating: LOW-MEDIUM**
Works for common fruits in good lighting. Not fine-tuned, internet-dependent, limited class coverage.

---

## 9. VAE (Variational Autoencoder)

**File**: `backend/models/vae_weights.h5` — **FILE ABSENT FROM BACKEND**
**Trained in**: `Notebooks/Updated_MDM_crop_prices.ipynb` Section (generative)

### Implementation
- Trained in notebook, weights exported
- No architecture details recoverable without reading VAE cell (weights file missing from backend)

### Integration
- ❌ No backend code loads `vae_weights.h5`
- ❌ No API endpoint exposes VAE functionality
- ❌ No frontend page references VAE

### Production Readiness
**Rating: ZERO — Trained but completely undeployed. Dead model.**

---

## 10. LLM / Voice Pipeline

**Files**: `backend/voice-to-voice/app/` (separate microservice, port 8001)
**Components**: Groq Whisper STT + OpenRouter LLaMA 3.3 70B + HuggingFace MMS-TTS-Mar

### Implementation
- STT: Groq `whisper-large-v3` — audio → Marathi/Hindi/English text
- LLM: `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter — farmer support responses
- TTS: `facebook/mms-tts-mar` via HuggingFace — text → Marathi speech
- System prompt: Marathi-first, safety-constrained (no pesticide dosage, no medical certainty)

### Integration
- `frontend/src/pages/VoiceAssistant.jsx` — fully connected to port 8001
- WebSocket endpoint `/ws/voice-chat` for streaming
- REST endpoint `/voice-chat` for single-turn

### Code Quality
- ✅ Clean provider abstraction (stt.py, llm.py, tts.py separate)
- ✅ Safety constraints in system prompt are well-designed
- ❌ Requires 3 external API keys — non-functional without `.env` configuration
- ⚠️ OpenRouter free tier has rate limits and model availability changes
- ⚠️ No retry logic on API failures

### Production Readiness
**Rating: MEDIUM**
Architecture is production-grade. External API dependency and missing `.env` template are deployment blockers.

---

## Summary Table

| Model | Deployed | Accuracy | UI Connected | Production Rating |
|---|---|---|---|---|
| Random Forest | ✅ | 99.71% | ✅ Live | HIGH |
| ANN | ✅ | 99.53% | ✅ Live | HIGH |
| DNN | ✅ | 63.75% (UI shows 99.1% ❌) | ⚠️ Static only | LOW |
| Gradient Boosting | ❌ Missing | 99.71% (notebook only) | ❌ Errors | ZERO |
| KMeans | ✅ | Silhouette 0.2435 | ⚠️ Partial | MEDIUM |
| Fruit Classifier CNN | ✅ | Unknown (external) | ✅ Live | MEDIUM |
| Freshness CNN | ✅ | Unknown (external) | ✅ Live | MEDIUM-HIGH |
| YOLOv8 | ✅ | Limited class coverage | ✅ Live | LOW-MEDIUM |
| VAE | ❌ Not deployed | Trained only | ❌ None | ZERO |
| LLM Voice Pipeline | ✅ | N/A | ✅ Live | MEDIUM |

---

## Critical Fixes Required (Priority Order)

1. **DNN accuracy in UI** — Change static 99.1% to actual 63.75% in `ModelPerformance.jsx` benchmark chart.
2. **Gradient Boosting** — Export `gb_model.pkl` from notebook, add to `backend/models/`, add loading + inference in `predict.py`.
3. **CropRecommendation.jsx** — Replace `createRecommendation()` string-length arithmetic with real `/predict` API call.
4. **MarketIntelligence.jsx** — Replace hardcoded scatter data with live KMeans cluster assignments from backend.
5. **VAE deployment** — Either deploy `vae_weights.h5` with a `/generate` endpoint or remove UI references.
6. **YOLOv8 local weights** — Download and commit `yolov8n.pt` to `backend/models/` to remove internet dependency.
7. **Input validation** — Add Pydantic request schema to `/predict` endpoint.
8. **Voice service `.env` template** — Add `.env.example` with required key names (GROQ_API_KEY, OPENROUTER_API_KEY, HF_API_KEY).
