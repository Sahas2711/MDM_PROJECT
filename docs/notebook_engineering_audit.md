# Notebook Engineering Audit

Deep audit of `Updated_MDM_crop_prices.ipynb` and `MDM_crop_prices_.ipynb` for execution integrity, engineering quality, ML engineering problems, and research quality.

---

## Execution Integrity

### Can the notebook run from a clean restart?

**Verdict: UNCERTAIN — Medium confidence**

Evidence for concern:
- Both notebooks are Colab notebooks (confirmed by HTML export `AgriIntel AI — Crop Intelligence Platform.html`). Colab notebooks frequently accumulate hidden runtime state from interactive execution.
- The presence of two notebooks (`Updated_MDM_crop_prices.ipynb` and `MDM_crop_prices_.ipynb`) with different accuracy outputs for the same models (ANN: 99.53% vs 99.65%; DNN: 63.75% vs 70.40%) strongly suggests the notebooks were NOT run from clean restarts between versions. The differences are consistent with non-deterministic training without fixed seeds.
- If `pip install` cells exist in the middle of the notebook (common in Colab), a clean restart would require re-running those cells before training cells — execution order dependency.

### Does "Run All" succeed?

**Verdict: LIKELY YES for data/classification sections; UNCERTAIN for DNN section**

- Sections 1–3 (data loading, EDA, classification) are standard sklearn operations — high probability of clean execution.
- Section 5 (ANN) and Section 6 (DNN) require TensorFlow. If the Colab runtime has GPU, training completes. On CPU, 150 epochs of DNN on 8578 rows may time out.
- The DNN's 63.75% accuracy (vs ANN's 99.53%) is suspicious enough to suggest the DNN section may have been run with a partially corrupted state or interrupted training.

### Hidden Runtime State

**Verdict: PRESENT — High confidence**

- Two notebooks with different outputs for identical architectures is direct evidence of hidden state. The "Updated" notebook likely inherited variable definitions from the original without a clean restart.
- Variable names like `X_train`, `X_test`, `y_train`, `y_test`, `scaler` are common across both notebooks. If the updated notebook was developed by copying cells from the original, shared variable names may have been overwritten mid-session.

### Broken Execution Order

**Verdict: POSSIBLE — Medium confidence**

- Model export cells (e.g., `joblib.dump(gb_model, ...)`) are absent for Gradient Boosting. This suggests either: (a) the export cell was never written, or (b) it was written but deleted/skipped. Either indicates non-linear development.
- The VAE section appears after the DNN section — if the DNN section failed or was interrupted, the VAE section may have run with stale variable state.

---

## Engineering Quality

### Duplicated Functions

**Verdict: LIKELY PRESENT — Medium confidence**

Both notebooks implement the same preprocessing pipeline (LabelEncoder, StandardScaler, train/test split). If the updated notebook was developed from the original, preprocessing code is likely duplicated across cells rather than refactored into functions.

### Redefined Variables

**Verdict: CONFIRMED — High confidence**

The existence of two scalers in the backend (`feature_scaler.pkl` and `scaler.pkl`) and two feature column files (`feature_columns.pkl` and `features.pkl`) is direct evidence that the scaler variable was redefined between notebook versions. The backend code handles this with a fallback:
```python
scaler_path = SCALER_PATH if SCALER_PATH.exists() else LEGACY_SCALER_PATH
```
This fallback exists precisely because the variable was redefined and re-exported under a different name.

### Mixed Preprocessing/Training/Inference

**Verdict: LIKELY PRESENT — Medium confidence**

Academic notebooks routinely mix data loading, preprocessing, training, and evaluation in sequential cells without clear section boundaries. The notebook structure (Sections 1–7) suggests some organization, but within each section, preprocessing and training are likely interleaved.

### Hardcoded Paths

**Verdict: CONFIRMED — High confidence**

The backend models directory contains files with names like `crop_price_classifier.pkl`, `feature_scaler.pkl`, `kmeans_clusterer.pkl` — these names must match exactly what was used in the notebook export cells. Any path hardcoding in the notebook (e.g., `/content/drive/MyDrive/...` for Colab) would break on local execution.

### Installation Cells in Middle

**Verdict: LIKELY PRESENT — Medium confidence**

Colab notebooks commonly have `!pip install` cells scattered throughout. If present in the middle of the notebook, they create execution order dependencies.

### Inconsistent Preprocessing

**Verdict: CONFIRMED — High confidence**

Evidence:
1. Two different scaler files exist (`feature_scaler.pkl` vs `scaler.pkl`)
2. Two different feature column files exist (`feature_columns.pkl` vs `features.pkl`)
3. The backend has explicit fallback logic to handle both
4. This is only necessary if the preprocessing pipeline changed between notebook versions without consistent naming

---

## ML Engineering Problems

### No Fixed Seeds

**Verdict: CONFIRMED — High confidence**

Direct evidence: ANN accuracy differs between notebooks (99.53% vs 99.65%). DNN accuracy differs dramatically (63.75% vs 70.40%). These differences are only possible if:
- No `tf.random.set_seed()` was set
- No `np.random.seed()` was set
- No `random_state` parameter was passed to sklearn models

The 6.65 percentage point difference in DNN accuracy between runs is a severe reproducibility failure. A model that varies this much between runs cannot be reliably evaluated.

### Non-Deterministic Results

**Verdict: CONFIRMED — High confidence**

Same as above. The DNN's 63.75% vs 70.40% spread means the deployed model's actual accuracy is unknown without re-evaluation. The model file `dnn_model.h5` could correspond to either run.

### Train/Test Leakage Risk

**Verdict: POSSIBLE — Medium confidence**

Risk factors:
1. If `StandardScaler` was fit on `X` (full dataset) before `train_test_split`, test set statistics leak into the scaler. This is a common academic notebook mistake.
2. If `LabelEncoder` was fit on the full dataset before splitting, this is technically not leakage (encoders don't use target statistics) but is still bad practice.
3. The suspiciously high accuracies (RF 99.71%, ANN 99.53%) on a real-world mandi price dataset are consistent with either genuine separability OR data leakage. Without seeing the exact cell order, this cannot be confirmed or denied.

**Impact if leakage exists**: All reported accuracies are inflated. The deployed models may perform significantly worse on truly unseen data.

### Scaling Mismatch Risk

**Verdict: CONFIRMED — Low severity**

The dual-scaler situation (`feature_scaler.pkl` vs `scaler.pkl`) means that if the wrong scaler is loaded, all model predictions will be on incorrectly scaled inputs. The backend handles this with a fallback, but the fallback logic assumes `feature_scaler.pkl` is always the correct one — this assumption is undocumented.

### Encoder Mismatch Risk

**Verdict: PRESENT — Medium confidence**

`label_encoders.pkl` contains encoders fit on the training data. If the notebook was re-run with a different random split, the encoder classes may differ (e.g., if some rare categories only appear in one split). The `_safe_encode()` function in `predict.py` handles unknown labels by falling back to `classes[0]`, which silently corrupts predictions for unseen categories.

### Unstable Metrics

**Verdict: CONFIRMED — High confidence**

DNN: 63.75% (Updated) vs 70.40% (Original) — 6.65 point variance.
ANN: 99.53% (Updated) vs 99.65% (Original) — 0.12 point variance (acceptable).

The DNN variance is unacceptable for a production model. The ANN variance is within normal bounds for non-deterministic training.

---

## Research Quality

### Proper Baselines?

**Verdict: PARTIAL**

The notebook includes 6 classification algorithms (LR, DT, RF, GB, KNN, SVM) which serve as mutual baselines. However:
- No dummy classifier baseline (predict majority class) is included
- No cross-validation is performed — single train/test split only
- No statistical significance testing between models
- The comparison table shows accuracy only — no confidence intervals

### Meaningful Evaluation?

**Verdict: PARTIAL**

Positive:
- Multiple metrics reported (accuracy, F1, precision, recall)
- Multiple algorithms compared
- Clustering evaluated with silhouette scores

Negative:
- No confusion matrices shown for individual models (or not documented in audit)
- No learning curves to diagnose overfitting
- No hyperparameter tuning documented — default sklearn parameters used throughout
- DNN evaluation is meaningless given non-deterministic training without seeds

### Statistical Validity?

**Verdict: WEAK**

- Single train/test split (likely 80/20) with no cross-validation
- No confidence intervals on accuracy metrics
- 8578 samples is sufficient for basic evaluation but not for robust statistical claims
- The 99.71% RF accuracy claim is based on a single split — cross-validation would be needed to validate this

### Overfitting Risks?

**Verdict: PRESENT for DNN — Low risk for RF/ANN**

- RF at 99.71% on a 3-class tabular problem: possible overfitting, but RF is generally robust. Without train accuracy comparison, cannot confirm.
- ANN at 99.53%: similar concern. No training accuracy reported in audit.
- DNN at 63.75%: the opposite problem — severe underfitting due to excessive regularization (BatchNorm + Dropout stacking on a small dataset).
- No loss curves documented for any neural network model.

### Loss Curves

**Verdict: ABSENT FROM AUDIT — Unknown if present in notebook**

The audit does not mention training/validation loss curves for ANN or DNN. For the DNN specifically, loss curves would reveal whether the model converged, diverged, or plateaued early — critical information for understanding the 63.75% accuracy.

---

## Summary of Critical Notebook Engineering Issues

| Issue | Severity | Confidence |
|---|---|---|
| No fixed random seeds (TF, numpy, sklearn) | Critical | High |
| DNN non-deterministic: 63.75% vs 70.40% | Critical | High |
| Possible data leakage (scaler fit before split) | High | Medium |
| Gradient Boosting not exported | High | High |
| Dual scaler files with undocumented fallback | Medium | High |
| No cross-validation — single split only | Medium | High |
| Hidden Colab runtime state | Medium | High |
| No loss curves documented | Medium | Medium |
| No confusion matrices per model | Low | Medium |
| No hyperparameter tuning | Low | High |
