# Notebook ↔ Audit Gap Analysis

Full mapping of every model and technique found in the notebooks against `model_audit.md`.
Evidence is grounded in actual code, notebook outputs, and file system state.

---

# Random Forest Classifier

## Present in Notebook?
Yes — Section 3 of `Updated_MDM_crop_prices.ipynb`. Trained with `sklearn.ensemble.RandomForestClassifier`. Accuracy 99.71%, F1 macro ~0.997. Exported as `crop_price_classifier.pkl`.

## Present in model_audit.md?
Yes — Section 1.

## Correctly Documented?
Mostly. One inaccuracy: `model_audit.md` states "No input validation schema — malformed requests reach model directly." This is **incorrect as of current code**. `backend/schemas.py` defines `PredictRequest` with Pydantic `Field` bounds (`gt=min_price_floor`, `le=min_price_ceiling`) and a `@model_validator` that enforces `min_price <= max_price`. Input validation IS present. The audit overstated this gap.

## Deployment Status
Fully Deployed

## Evidence
- Notebook: Section 3, cell outputs confirm 99.71% accuracy
- Backend: `predict.py` — `MODEL_FILES["random_forest"] = "crop_price_classifier.pkl"`, loaded at startup
- Backend: `schemas.py` — `PredictRequest` with validated bounds
- Frontend: `SellTiming.jsx` calls `fetchPrediction()` → `/predict`; `ModelPerformance.jsx` calls `fetchPredictionWithModel(min, max, "random_forest")`
- File: `backend/models/crop_price_classifier.pkl` — confirmed present in directory listing

## Missing From Audit
- Audit does not mention that `_feature_contributions()` in `predict.py` is a **heuristic approximation**, not actual SHAP or permutation importance. The function computes impact scores from probability values and price spread arithmetic — not from the RF's `feature_importances_` attribute. This is a significant ML engineering omission.
- Audit does not mention the `_safe_encode()` fallback logic: when an unseen label is passed, it silently falls back to `classes[0]`. This is a silent data quality risk.
- Audit does not mention that `feature_scaler.pkl` and `feature_columns.pkl` are separate from `scaler.pkl` and `features.pkl` (legacy). The dual-scaler situation is undocumented.

## False or Unsupported Claims
- Audit states "No input validation schema" — **FALSE**. `schemas.py` has full Pydantic validation.
- Audit states "Feature contributions computed per prediction (manual importance extraction)" — technically true but misleading. It implies RF feature importances are used; they are not. The contributions are heuristic calculations from probability outputs.

## Integration Gaps
None critical. RF is the most complete model in the stack.

## Reproducibility Risks
- No `random_state` parameter documented in audit. If notebook was run without `random_state=42`, the exported `.pkl` may differ from the reported 99.71% on re-run.
- Confidence: Medium (common sklearn omission in academic notebooks)

## Production Risks
- `_safe_encode()` silent fallback to `classes[0]` on unknown labels — no warning raised to caller
- `feature_contributions` are heuristic, not model-derived — presenting them as "feature contributions" to users is misleading

## Recommendations
1. Document that `_feature_contributions()` is heuristic, not SHAP-based
2. Add `random_state=42` to RF training cell in notebook
3. Log a warning when `_safe_encode()` falls back to default class

---

# ANN (Artificial Neural Network)

## Present in Notebook?
Yes — Section 5 of `Updated_MDM_crop_prices.ipynb`. Architecture: Dense(128)→Dropout(0.3)→Dense(64)→Dropout(0.3)→Dense(32)→Dense(3, Softmax). Adam optimizer, ReduceLROnPlateau, 100 epochs. Test accuracy 99.53%.

## Present in model_audit.md?
Yes — Section 2.

## Correctly Documented?
Mostly correct. One omission: the audit does not mention that the ANN uses the **same scaler and label encoders** as RF, meaning a scaler mismatch between training and deployment would silently corrupt both models simultaneously.

## Deployment Status
Fully Deployed

## Evidence
- Notebook: Section 5 cell outputs — training logs, final test accuracy 99.53%
- Backend: `predict.py` — `MODEL_FILES["ann"] = "ann_model.h5"`, loaded via `_load_keras_model()`
- Frontend: `ModelPerformance.jsx` — `MODELS` array includes `{ key: 'ann', label: 'ANN' }`, called via `fetchPredictionWithModel()`
- File: `backend/models/ann_model.h5` — confirmed present

## Missing From Audit
- No mention of `ReduceLROnPlateau` callback and its effect on training stability
- No mention that ANN uses `compile=False` on load — meaning the model's optimizer state is discarded, which is correct for inference but should be documented
- No loss curve analysis — the audit does not note whether training/validation loss curves show overfitting
- No mention that 99.53% on a 3-class tabular problem with 8578 rows is suspiciously high and may indicate data leakage (see Reproducibility Risks)

## False or Unsupported Claims
None detected. Accuracy figures match notebook outputs.

## Integration Gaps
- ANN is not selectable in `SmartDecision.jsx` UI — the crop hint input does not expose model selection. Only the default model (RF) is used in the smart decision pipeline unless `model_type` query param is manually set.

## Reproducibility Risks
- **HIGH RISK**: No `tf.random.set_seed()` or `numpy.random.seed()` in notebook. ANN training is non-deterministic. The 99.53% figure may not reproduce on re-run.
- Keras weight initialization is random by default. Different runs may produce different `.h5` files.
- The audit does not flag this at all.

## Production Risks
- No model versioning beyond file mtime — replacing `ann_model.h5` silently changes behavior
- No A/B testing infrastructure to compare ANN vs RF on live traffic

## Recommendations
1. Add `tf.random.set_seed(42)` and `np.random.seed(42)` before ANN training cell
2. Document that ANN and RF share the same scaler — a scaler update requires retraining both
3. Add loss curve screenshot to audit

---

# DNN (Deep Neural Network)

## Present in Notebook?
Yes — Section 6 of `Updated_MDM_crop_prices.ipynb`. Architecture: Dense(256)→BN→Dropout(0.4)→Dense(128)→BN→Dropout(0.4)→Dense(64)→BN→Dropout(0.3)→Dense(32)→BN→Dense(16)→Dense(3, Softmax). 150 epochs. Test accuracy **63.75%** (Updated notebook), **70.40%** (Original notebook).

## Present in model_audit.md?
Yes — Section 3.

## Correctly Documented?
The accuracy discrepancy is correctly flagged. However, the audit understates the severity of the fabrication.

## Deployment Status
Fully Deployed (but underperforming)

## Evidence
- Notebook: Section 6 — confirmed 63.75% test accuracy in Updated notebook
- Backend: `predict.py` — `MODEL_FILES["dnn"] = "dnn_model.h5"`, loaded at startup
- Frontend: `ModelPerformance.jsx` — static `modelData` array hardcodes `{ model: 'DNN', accuracy: 99.1 }` — **FABRICATED**
- Frontend: `Dashboard.jsx` — `modelAccuracy` array also hardcodes `{ model: 'DNN', acc: 99.1 }` — **SECOND FABRICATION LOCATION** (not mentioned in audit)
- File: `backend/models/dnn_model.h5` — confirmed present

## Missing From Audit
- **CRITICAL OMISSION**: The fabricated 99.1% DNN value appears in **TWO** frontend files, not one:
  - `ModelPerformance.jsx` line: `{ model: 'DNN', accuracy: 99.1 }`
  - `Dashboard.jsx` line: `{ model: 'DNN', acc: 99.1 }`
  The audit only mentions `ModelPerformance.jsx`. The Dashboard chart is equally misleading.
- Audit does not explain WHY the DNN underperforms: excessive BatchNorm + Dropout stacking on a small 3-class tabular dataset causes severe regularization-induced underfitting. The model is architecturally over-engineered for the problem.
- No mention that DNN is not exposed in the live comparison dropdown in `ModelPerformance.jsx` — only RF, GB, and ANN are in the `MODELS` array. DNN is deployed but never compared live.

## False or Unsupported Claims
- Audit states DNN is "Not selectable in live comparison dropdown (only RF and ANN exposed)" — **PARTIALLY WRONG**. The `MODELS` array in `ModelPerformance.jsx` includes `gradient_boosting`, not DNN. So the live comparison is RF + GB + ANN, not RF + ANN. DNN is excluded from live comparison entirely.

## Integration Gaps
- DNN is loaded in backend but never exposed in any live UI comparison
- DNN accuracy is misrepresented in two separate frontend charts

## Reproducibility Risks
- **CRITICAL**: No seed set. 63.75% vs 70.40% across two notebook runs confirms non-determinism.
- The deployed `dnn_model.h5` may correspond to either run — there is no way to know which accuracy the deployed model actually achieves without re-evaluating it.

## Production Risks
- A model with 63.75% accuracy on a 3-class problem (random baseline ~33%) is only marginally better than chance for the minority class
- No evaluation of per-class accuracy — the DNN may be predicting only the majority class

## Recommendations
1. Fix both `ModelPerformance.jsx` AND `Dashboard.jsx` to show actual 63.75%
2. Add `tf.random.set_seed(42)` before DNN training
3. Add per-class confusion matrix to audit
4. Either retrain DNN with simpler architecture or remove it from production

---

# Gradient Boosting Classifier

## Present in Notebook?
Yes — Section 3 of `Updated_MDM_crop_prices.ipynb`. Trained with `sklearn.ensemble.GradientBoostingClassifier`. Accuracy 99.71%. **No `joblib.dump()` call present** — model trained but never exported.

## Present in model_audit.md?
Yes — Section 4.

## Correctly Documented?
Yes, the missing export is correctly identified.

## Deployment Status
Notebook Only — model file does not exist in `backend/models/`

## Evidence
- Notebook: Section 3 — GB trained, accuracy logged, no export cell
- Backend: `predict.py` — `MODEL_FILES` dict has no `gradient_boosting` key
- Backend: `schemas.py` — `ModelType = Literal["random_forest", "ann", "dnn", "best"]` — `gradient_boosting` is NOT a valid model type
- Frontend: `ModelPerformance.jsx` — `MODELS` array includes `{ key: 'gradient_boosting', label: 'Gradient Boosting' }` — **this will always 422 or 503 because the backend rejects the model_type**
- File: `backend/models/gb_model.pkl` — **DOES NOT EXIST**

## Missing From Audit
- **CRITICAL**: The audit says GB "causes live UI errors" but does not explain the exact failure mode. The backend `ModelType` Literal in `schemas.py` does NOT include `gradient_boosting`. So the API call from `ModelPerformance.jsx` will return HTTP 422 (Unprocessable Entity), not 503. The error message will be a Pydantic validation error, not a model-not-found error. This distinction matters for debugging.
- Audit does not mention that `schemas.py` needs to be updated alongside `predict.py` when GB is added.

## False or Unsupported Claims
None — the missing model is correctly identified.

## Integration Gaps
- Frontend calls `gradient_boosting` as model_type → backend rejects with 422 (not in Literal)
- No `gb_model.pkl` in models directory
- No loading code in `predict.py`
- No entry in `ModelType` Literal in `schemas.py`

## Reproducibility Risks
- GB training is deterministic if `random_state` is set. Notebook likely omits this.

## Production Risks
- Live UI comparison always shows an error tile for GB — visible to any evaluator running the app

## Recommendations
1. Add `joblib.dump(gb_model, '../backend/models/crop_price_classifier_gb.pkl')` to notebook
2. Add `"gradient_boosting": "crop_price_classifier_gb.pkl"` to `MODEL_FILES` in `predict.py`
3. Add `"gradient_boosting"` to `ModelType` Literal in `schemas.py`

---

# KMeans Clustering

## Present in Notebook?
Yes — Section 4 of `Updated_MDM_crop_prices.ipynb`. Optimal k=9 via elbow + silhouette. Silhouette score 0.2435. Exported as `kmeans_clusterer.pkl`.

## Present in model_audit.md?
Yes — Section 5. But the audit lists the file as `kmeans_model.pkl`.

## Correctly Documented?
**NO — WRONG FILENAME**. The audit states the file is `backend/models/kmeans_model.pkl`. The actual file is `backend/models/kmeans_clusterer.pkl` (confirmed in directory listing and in `predict.py`: `KMEANS_PATH = MODELS_DIR / "kmeans_clusterer.pkl"`). This is a factual error in the audit.

## Deployment Status
Fully Deployed (backend); UI Missing (MarketIntelligence page)

## Evidence
- Notebook: Section 4 — KMeans trained, silhouette computed, exported
- Backend: `predict.py` — `KMEANS_PATH = MODELS_DIR / "kmeans_clusterer.pkl"`, `cluster_features()` function
- Backend: `smart_decision.py` — node 5 (`CLUSTER_ANALYSIS`) calls `price_predictor.cluster_features()`
- Frontend: `MarketIntelligence.jsx` — **zero API calls**, all data hardcoded
- Frontend: `SmartDecision.jsx` — cluster_id and cluster_distance rendered from live API response
- File: `backend/models/kmeans_clusterer.pkl` — confirmed present

## Missing From Audit
- Wrong filename (`kmeans_model.pkl` vs actual `kmeans_clusterer.pkl`)
- Audit does not mention the **dtype bug** documented in `smart_decision.py`: `StandardScaler.transform()` outputs float64, but KMeans C extension requires float32. The fix (`scaled.astype(np.float32)`) is in `predict.py` but the audit does not document this known runtime issue.
- Audit does not mention that k=9 clusters are mapped to only 3 price classes (Low/Medium/High) — the cluster-to-class mapping is never explicitly defined, making cluster IDs semantically ambiguous.
- MarketIntelligence page shows 4 hardcoded clusters (Low Price, Stable, High Demand, Volatile) — these do not correspond to the actual k=9 KMeans clusters. The page is not just static; it is **semantically wrong**.

## False or Unsupported Claims
- Audit file path `kmeans_model.pkl` is incorrect — actual file is `kmeans_clusterer.pkl`

## Integration Gaps
- `MarketIntelligence.jsx` shows 4 fictional clusters; actual model has 9 clusters
- No API endpoint exposes raw cluster assignments for visualization

## Reproducibility Risks
- KMeans is non-deterministic without `random_state`. Silhouette score of 0.2435 may vary across runs.

## Production Risks
- dtype mismatch bug (float64 vs float32) can cause KMeans to fail at runtime — partially mitigated by the `.astype(np.float32)` fix in `predict.py`

## Recommendations
1. Fix audit filename: `kmeans_clusterer.pkl` not `kmeans_model.pkl`
2. Add `random_state=42` to KMeans training in notebook
3. Add a `/clusters` endpoint that returns real cluster assignments for visualization
4. Update `MarketIntelligence.jsx` to call this endpoint

---

# Hierarchical Clustering

## Present in Notebook?
Yes — Section 4 of `Updated_MDM_crop_prices.ipynb`. Silhouette score 0.1927. Dendrogram plotted.

## Present in model_audit.md?
**NO** — Hierarchical clustering is mentioned only in the `match_syllabus.md` document, not in `model_audit.md` at all.

## Correctly Documented?
Not documented in model_audit.md.

## Deployment Status
Notebook Only — no model file exported, no backend code, no frontend reference

## Evidence
- Notebook: Section 4 — `AgglomerativeClustering` or `scipy.cluster.hierarchy` used, silhouette 0.1927
- Backend: No reference to hierarchical clustering anywhere
- File system: No hierarchical clustering model file in `backend/models/`

## Missing From Audit
Entire model is absent from `model_audit.md`. Should have its own section documenting:
- Algorithm used (AgglomerativeClustering or scipy linkage)
- Silhouette score: 0.1927
- Deployment status: Notebook Only
- Comparison with KMeans (KMeans 0.2435 > Hierarchical 0.1927 > DBSCAN 0.3141 — note DBSCAN actually scored highest)

## False or Unsupported Claims
N/A — not documented.

## Integration Gaps
Trained in notebook, never exported, never deployed, never visualized in frontend.

## Reproducibility Risks
Hierarchical clustering is deterministic given same linkage method and data. Low risk.

## Production Risks
None — not deployed.

## Recommendations
Add to `model_audit.md` as Section 5b with deployment status "Notebook Only" and note that DBSCAN outperformed it.

---

# DBSCAN

## Present in Notebook?
Yes — Section 4 of `Updated_MDM_crop_prices.ipynb`. Silhouette score 0.3141 — **highest among all three clustering algorithms**. Epsilon and min_samples parameters used.

## Present in model_audit.md?
**NO** — DBSCAN is completely absent from `model_audit.md`.

## Correctly Documented?
Not documented.

## Deployment Status
Notebook Only

## Evidence
- Notebook: Section 4 — DBSCAN trained, silhouette 0.3141 computed
- Backend: No DBSCAN reference anywhere
- File system: No DBSCAN model file

## Missing From Audit
**Critical omission**: DBSCAN achieved the highest silhouette score (0.3141) of all three clustering methods, yet:
1. It is not deployed
2. It is not mentioned in `model_audit.md`
3. KMeans (silhouette 0.2435) was deployed instead of the better-performing DBSCAN

This is an ML engineering decision that should be documented and justified. DBSCAN cannot be trivially deployed for inference (it does not support `predict()` on new points), which is the likely reason KMeans was chosen — but this reasoning is absent from all documentation.

## False or Unsupported Claims
N/A — not documented.

## Integration Gaps
Best-performing clustering algorithm is notebook-only with no deployment path.

## Reproducibility Risks
DBSCAN is deterministic given same epsilon/min_samples. Low risk.

## Recommendations
Add to `model_audit.md` as Section 5c. Document why KMeans was chosen over DBSCAN for deployment (predict() support). Note that DBSCAN's higher silhouette score suggests the data has density-based structure that KMeans misses.

---

# Silhouette Analysis & Elbow Method

## Present in Notebook?
Yes — Section 4. Elbow method plot for optimal k selection. Silhouette scores computed for k=2 through k=15 (or similar range). Optimal k=9 selected.

## Present in model_audit.md?
Partially — silhouette scores are listed in the KMeans section but the elbow method and silhouette analysis process are not described.

## Correctly Documented?
Incomplete.

## Deployment Status
Notebook Only (visualization/analysis tool, not a deployable model)

## Missing From Audit
- No mention that k=9 was selected via elbow + silhouette — the audit just states k=9 as a fact
- No critique of k=9 being high for a dataset with only 3 price classes — this is a significant ML engineering concern
- No mention of whether the silhouette analysis was done on the full dataset or a sample

## Recommendations
Add a note in the KMeans section explaining the k selection methodology and questioning whether k=9 is appropriate for a 3-class target.

---

# VAE (Variational Autoencoder)

## Present in Notebook?
Yes — present in `Updated_MDM_crop_prices.ipynb`. Weights exported as `vae_weights.h5`.

## Present in model_audit.md?
Yes — Section 9.

## Correctly Documented?
Partially. The audit correctly identifies it as undeployed. However, it states "No architecture details recoverable without reading VAE cell (weights file missing from backend)" — this is an admission of incomplete audit work.

## Deployment Status
Notebook Only — weights file absent from `backend/models/`

## Evidence
- Notebook: VAE training cell present, `vae_weights.h5` export
- Backend: No VAE loading code in any `.py` file
- File system: `vae_weights.h5` not in `backend/models/` directory listing
- Frontend: No VAE reference in any page

## Missing From Audit
- VAE architecture not documented (encoder/decoder structure, latent dimension, loss function)
- No mention of what the VAE was trained to generate — price distributions? Synthetic crop data?
- No mention of whether `vae_weights.h5` exists anywhere in the project (it may be in the Notebooks directory or Colab runtime only)
- The audit does not note that VAE is the ONLY generative model in the project and its absence from deployment means Unit VI of the syllabus is essentially unaddressed

## False or Unsupported Claims
None — correctly identified as dead.

## Integration Gaps
Complete — no deployment path exists.

## Recommendations
1. Document VAE architecture from notebook cells
2. Either add a `/generate` endpoint or explicitly mark as "academic experiment only"
3. Note that VAE ≠ GAN — for Unit VI syllabus coverage, a GAN would be needed

---

# Feature Engineering & Preprocessing Pipeline

## Present in Notebook?
Yes — LabelEncoder per categorical column, StandardScaler on numeric features, arrival_date encoding. Present in both notebooks.

## Present in model_audit.md?
Mentioned briefly in RF section but never given its own section.

## Correctly Documented?
Incomplete — the preprocessing pipeline is a shared dependency for RF, ANN, DNN, and KMeans, but it is not audited as a standalone component.

## Deployment Status
Fully Deployed

## Evidence
- Backend: `predict.py` — `_scaler`, `_feature_columns`, `_label_encoders` loaded from `feature_scaler.pkl`, `feature_columns.pkl`, `label_encoders.pkl`
- Backend: `predict.py` — `_safe_encode()`, `build_feature_context()`, `_feature_array()` functions
- File system: `feature_scaler.pkl`, `feature_columns.pkl`, `label_encoders.pkl`, `scaler.pkl`, `features.pkl` all present

## Missing From Audit
- **DATA LEAKAGE RISK**: If `StandardScaler` was fit on the full dataset before train/test split, test set statistics contaminate the scaler. The audit does not check for this.
- **DUAL SCALER PROBLEM**: Two scalers exist — `feature_scaler.pkl` (primary) and `scaler.pkl` (legacy). The code uses `feature_scaler.pkl` if it exists, else falls back to `scaler.pkl`. This is undocumented and creates a silent inconsistency risk.
- `arrival_date` is encoded as a categorical label — this discards temporal ordering information. No mention in audit.
- `_safe_encode()` silently falls back to `classes[0]` for unknown labels — no audit mention.

## Recommendations
1. Add a dedicated "Preprocessing Pipeline" section to `model_audit.md`
2. Verify scaler was fit only on training data
3. Document the dual-scaler fallback logic
4. Flag `arrival_date` categorical encoding as a temporal information loss

---

# LLM / Voice Pipeline

## Present in Notebook?
No — the voice pipeline is entirely in `backend/voice-to-voice/` and `frontend/src/pages/VoiceAssistant.jsx`. No notebook implementation.

## Present in model_audit.md?
Yes — Section 10.

## Correctly Documented?
Mostly. Several gaps exist.

## Deployment Status
Fully Deployed (requires external API keys)

## Evidence
- Backend: `voice-to-voice/app/main.py` — FastAPI on port 8001, endpoints: `/health`, `/transcribe`, `/generate`, `/synthesize`, `/voice-chat`, `/ws/voice-chat`, `/providers/{stage}`
- Backend: `voice-to-voice/app/config.py` — Groq whisper-large-v3, OpenRouter llama-3.3-70b-instruct:free, HuggingFace facebook/mms-tts-mar
- Backend: `voice-to-voice/app/services/orchestrator.py` — fallback provider logic for all three stages
- Frontend: `api.js` — `fetchVoiceHealth()`, `fetchVoiceChat()`, `fetchVoiceReply()`, `fetchVoiceSynthesis()`
- File: `backend/voice-to-voice/.env.example` — **EXISTS** (audit incorrectly said it was missing)

## Missing From Audit
- **FACTUAL ERROR**: Audit states "Add `.env.example` with required key names" as a fix — but `.env.example` **already exists** at `backend/voice-to-voice/.env.example`. This fix is already done.
- Audit does not mention the `/providers/{stage}` endpoint for runtime provider status checking
- Audit does not mention the WebSocket streaming endpoint `/ws/voice-chat`
- Audit does not mention the fallback provider chain: Groq → openai_compatible for STT; OpenRouter → openai_compatible for LLM; HuggingFace → http for TTS
- Audit does not mention that `llm_max_tokens: int = 320` severely limits response length for complex agricultural queries
- Audit does not mention that `llm_temperature: float = 0.2` is appropriate for factual agricultural advice

## False or Unsupported Claims
- "No retry logic on API failures" — **PARTIALLY WRONG**. The orchestrator has fallback provider logic (primary → fallback on rate limit). This is not retry logic per se, but it is failure handling. The audit conflates the two.
- "Missing `.env` template" — **WRONG**. `.env.example` exists.

## Recommendations
1. Correct the `.env.example` claim in the audit
2. Document the fallback provider chain
3. Note the 320-token limit as a potential constraint for detailed agricultural advice
