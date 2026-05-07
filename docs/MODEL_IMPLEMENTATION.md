# MODEL_IMPLEMENTATION.md
> Updated: May 2026

## Training Pipeline

All models trained via `backend/train_models.py` using `dataset/crop_prices.csv`.

**Features (9):** `min_price`, `max_price`, `state_encoded`, `district_encoded`, `market_encoded`, `commodity_encoded`, `variety_encoded`, `grade_encoded`, `arrival_date_encoded`

**Target:** `price_class` — Low / Medium / High (derived from modal_price tertile split)

**Preprocessing:** `OrdinalEncoder` for categoricals, `StandardScaler` for all 9 features. Artifacts saved to `backend/models/` and registered in `artifact_manifest.json`.

---

## Models in Production

### Random Forest (`crop_price_classifier.pkl`)
- sklearn `RandomForestClassifier`
- Loaded via `joblib.load()`
- Supports `predict_proba` → real confidence scores
- Default model (`model_type=best`)

### Gradient Boosting (`crop_price_classifier_gb_*.joblib`)
- sklearn `GradientBoostingClassifier`
- Loaded via manifest path
- Supports `predict_proba`

### ANN (`ann_model.h5`)
- Keras: Dense(128, relu) → Dense(64, relu) → Dense(3, softmax)
- Loaded via `keras.models.load_model(compile=False)`
- Probabilities from `model.predict()` directly

### DNN (`dnn_model.h5`)
- Keras: deeper variant of ANN
- Same loading/inference path

### CNN Freshness (`cnn_food_quality_model.h5`)
- Input: 128×128 RGB, normalized to [0,1]
- Output: Dense(2, softmax) — index 0=Fresh, index 1=Rotten
- Used by `/predict-image` and `/smart-decision`

### Fruit Classifier (`fruit_classifier.h5`)
- Input: 224×224 RGB crop from YOLO bounding box
- Output: 20-class softmax (fresh/rotten × 10 fruit types)
- Used internally by `predict_image.py`

### YOLOv8 Nano (`yolov8n.pt`)
- Pretrained COCO weights (Ultralytics)
- Only 4 labels used: apple, banana, orange, carrot
- Confidence threshold: 0.35

### KMeans (`kmeans_clusterer.pkl`)
- Trained on same 9-feature scaled vectors
- Used for market segment clustering in `/predict` and `/smart-decision`
- Exposed via `GET /clusters`

---

## Inference Flow (`predict.py`)

```
min_price, max_price, crop_hint, [optional context]
    │
    ▼
build_feature_context()  — OrdinalEncoder lookup for all 9 features
    │
    ▼
_feature_array()  — ordered numpy array matching feature_columns.pkl
    │
    ▼
scaler.transform()  — StandardScaler
    │
    ▼
_predict_probabilities()  — sklearn.predict_proba or keras.predict
    │
    ▼
intelligence.enrich()  — confidence, price_range_analysis, market_insight
    │
    ▼
_recommendation_from_label()  — High→SELL, Medium+conf≥0.75→SELL, else HOLD
    │
    ▼
cluster_features()  — KMeans cluster_id + distance
    │
    ▼
_feature_contributions()  — heuristic impact scores
```

---

## Manifest (`artifact_manifest.json`)

All artifact paths, model kinds, and training timestamp are stored in `backend/models/artifact_manifest.json`. The backend reads this at startup — no hardcoded paths in `predict.py`.

```json
{
  "timestamp": "20260507T091738Z",
  "default_model": "random_forest",
  "models": {
    "random_forest": {"path": "...", "kind": "sklearn"},
    "gradient_boosting": {"path": "...", "kind": "sklearn"},
    "ann": {"path": "ann_model.h5", "kind": "keras"},
    "dnn": {"path": "dnn_model.h5", "kind": "keras"}
  },
  "preprocessing": {
    "encoder_path": "...",
    "scaler_path": "...",
    "feature_columns_path": "..."
  },
  "kmeans": {"path": "..."},
  "metadata_path": "...",
  "metrics_path": "..."
}
```
