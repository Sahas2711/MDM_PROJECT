from __future__ import annotations

import json
import os
import random
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import (
    StratifiedKFold,
    cross_validate,
    learning_curve,
    train_test_split,
    validation_curve,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler
from tensorflow import keras  # type: ignore
import tensorflow as tf  # type: ignore


SEED = 42
TARGET_COLUMN = "price_class"
LABELS = ["Low", "Medium", "High"]
CATEGORICAL_COLUMNS = ["state", "district", "market", "commodity", "variety", "grade", "arrival_date"]
NUMERIC_COLUMNS = ["min_price", "max_price"]
FEATURE_COLUMNS = NUMERIC_COLUMNS + [f"{column}_encoded" for column in CATEGORICAL_COLUMNS]
DEFAULT_MODEL_KEY = "random_forest"
CLASS_TO_INDEX = {label: index for index, label in enumerate(LABELS)}
INDEX_TO_CLASS = {index: label for label, index in CLASS_TO_INDEX.items()}


def set_global_determinism(seed: int = SEED) -> None:
    os.environ["PYTHONHASHSEED"] = str(seed)
    os.environ.setdefault("TF_DETERMINISTIC_OPS", "1")
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    keras.utils.set_random_seed(seed)


@dataclass
class ArtifactPaths:
    manifest: str
    encoder: str
    scaler: str
    feature_columns: str
    metadata: str
    experiment_log: str
    metrics: str
    random_forest_model: str
    gradient_boosting_model: str
    ann_model: str
    dnn_model: str
    ann_checkpoint: str
    dnn_checkpoint: str
    kmeans_model: str


@dataclass
class SplitData:
    X_train_raw: pd.DataFrame
    X_test_raw: pd.DataFrame
    y_train_idx: np.ndarray
    y_test_idx: np.ndarray
    y_train_label: pd.Series
    y_test_label: pd.Series


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _versioned_name(stem: str, timestamp: str, suffix: str) -> str:
    return f"{stem}_{timestamp}{suffix}"


def _price_bucket(row: pd.Series) -> str:
    modal_price = float(row["modal_price"])
    if modal_price < 1500:
        return "Low"
    if modal_price < 4000:
        return "Medium"
    return "High"


class SharedPreprocessor:
    def __init__(self) -> None:
        self.encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        self.scaler = StandardScaler()
        self.fitted = False
        self.feature_columns = list(FEATURE_COLUMNS)

    def fit(self, frame: pd.DataFrame) -> "SharedPreprocessor":
        encoded = self.encoder.fit_transform(frame[CATEGORICAL_COLUMNS])
        features = np.column_stack([frame[NUMERIC_COLUMNS].to_numpy(dtype=np.float32), encoded.astype(np.float32)])
        self.scaler.fit(features)
        self.fitted = True
        return self

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        if not self.fitted:
            raise RuntimeError("SharedPreprocessor must be fitted before transform().")
        encoded = self.encoder.transform(frame[CATEGORICAL_COLUMNS])
        features = np.column_stack([frame[NUMERIC_COLUMNS].to_numpy(dtype=np.float32), encoded.astype(np.float32)])
        scaled = self.scaler.transform(features)
        return scaled.astype(np.float32)

    def fit_transform(self, frame: pd.DataFrame) -> np.ndarray:
        self.fit(frame)
        return self.transform(frame)

    def transform_payload(self, payload: dict[str, Any]) -> np.ndarray:
        frame = pd.DataFrame([{column: payload[column] for column in CATEGORICAL_COLUMNS + NUMERIC_COLUMNS}])
        return self.transform(frame)

    def safe_encode(self, column: str, value: str | None, fallback: str | None = None) -> tuple[int, str]:
        if column not in CATEGORICAL_COLUMNS:
            raise KeyError(f"Unsupported categorical column: {column}")
        categories = [str(item) for item in self.encoder.categories_[CATEGORICAL_COLUMNS.index(column)]]
        candidates = [value, fallback]

        for candidate in candidates:
            if not candidate:
                continue
            exact = next((item for item in categories if item.lower() == candidate.lower()), None)
            if exact is not None:
                encoded = self.encoder.transform(pd.DataFrame([{column: exact}], columns=[column]))[0][0]
                return int(encoded), exact
            partial = next((item for item in categories if candidate.lower() in item.lower()), None)
            if partial is not None:
                encoded = self.encoder.transform(pd.DataFrame([{column: partial}], columns=[column]))[0][0]
                return int(encoded), partial

        chosen = categories[0]
        encoded = self.encoder.transform(pd.DataFrame([{column: chosen}], columns=[column]))[0][0]
        return int(encoded), chosen


def load_dataset(dataset_path: str | Path) -> pd.DataFrame:
    frame = pd.read_csv(dataset_path)
    frame = frame.dropna(subset=CATEGORICAL_COLUMNS + NUMERIC_COLUMNS + ["modal_price"]).copy()
    frame["arrival_date"] = frame["arrival_date"].astype(str)
    for column in CATEGORICAL_COLUMNS:
        frame[column] = frame[column].astype(str).str.strip()
    for column in NUMERIC_COLUMNS + ["modal_price"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame = frame.dropna(subset=NUMERIC_COLUMNS + ["modal_price"]).copy()
    frame[TARGET_COLUMN] = frame.apply(_price_bucket, axis=1)
    return frame.reset_index(drop=True)


def split_dataset(frame: pd.DataFrame, test_size: float = 0.2, seed: int = SEED) -> SplitData:
    X = frame[CATEGORICAL_COLUMNS + NUMERIC_COLUMNS].copy()
    y = frame[TARGET_COLUMN].copy()
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=seed,
        stratify=y,
    )
    return SplitData(
        X_train_raw=X_train.reset_index(drop=True),
        X_test_raw=X_test.reset_index(drop=True),
        y_train_idx=y_train.map(CLASS_TO_INDEX).to_numpy(dtype=np.int64),
        y_test_idx=y_test.map(CLASS_TO_INDEX).to_numpy(dtype=np.int64),
        y_train_label=y_train.reset_index(drop=True),
        y_test_label=y_test.reset_index(drop=True),
    )


def build_sklearn_models(seed: int = SEED) -> dict[str, Any]:
    return {
        "random_forest": RandomForestClassifier(
            n_estimators=150,
            max_depth=None,
            min_samples_leaf=2,
            random_state=seed,
            n_jobs=1,
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=120,
            learning_rate=0.05,
            max_depth=3,
            random_state=seed,
        ),
    }


def build_neural_network(input_dim: int, output_dim: int, depth: str, seed: int = SEED) -> keras.Model:
    keras.utils.set_random_seed(seed)
    if depth == "ann":
        units = [64, 32]
        dropout = [0.15, 0.1]
    else:
        units = [128, 64, 32]
        dropout = [0.2, 0.15, 0.1]

    model = keras.Sequential(name=f"{depth}_classifier")
    model.add(keras.layers.Input(shape=(input_dim,)))
    for unit_count, dropout_rate in zip(units, dropout):
        model.add(keras.layers.Dense(unit_count, activation="relu"))
        model.add(keras.layers.Dropout(dropout_rate))
    model.add(keras.layers.Dense(output_dim, activation="softmax"))
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def _classification_artifacts(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    report = classification_report(y_true, y_pred, target_names=LABELS, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_true, y_pred, labels=list(range(len(LABELS))))
    return {
        "confusion_matrix": matrix.tolist(),
        "classification_report": report,
        "macro_f1": float(f1_score(y_true, y_pred, average="macro")),
        "weighted_f1": float(f1_score(y_true, y_pred, average="weighted")),
    }


def evaluate_sklearn_models(
    models: dict[str, Any],
    split: SplitData,
    preprocessor: SharedPreprocessor,
    seed: int = SEED,
) -> tuple[dict[str, Any], dict[str, Any]]:
    X_train = preprocessor.transform(split.X_train_raw)
    X_test = preprocessor.transform(split.X_test_raw)
    results: dict[str, Any] = {}
    trained_models: dict[str, Any] = {}
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=seed)

    for model_key, model in models.items():
        pipeline = Pipeline([("estimator", clone(model))])
        scores = cross_validate(
            pipeline,
            X_train,
            split.y_train_idx,
            cv=cv,
            scoring=["accuracy", "f1_macro", "precision_macro", "recall_macro"],
            n_jobs=1,
            return_train_score=False,
        )

        fitted_model = clone(model)
        fitted_model.fit(X_train, split.y_train_idx)
        y_pred = fitted_model.predict(X_test)
        artifacts = _classification_artifacts(split.y_test_idx, y_pred)

        train_sizes, train_scores, valid_scores = learning_curve(
            clone(model),
            X_train,
            split.y_train_idx,
            cv=cv,
            train_sizes=np.linspace(0.25, 1.0, 4),
            scoring="accuracy",
            n_jobs=1,
            shuffle=True,
            random_state=seed,
        )

        param_name = "n_estimators"
        param_range = np.array([50, 100, 150])
        validation_train, validation_test = validation_curve(
            clone(model),
            X_train,
            split.y_train_idx,
            param_name=param_name,
            param_range=param_range,
            cv=cv,
            scoring="accuracy",
            n_jobs=1,
        )

        results[model_key] = {
            "model_type": "sklearn",
            "cv_accuracy_mean": float(np.mean(scores["test_accuracy"])),
            "cv_accuracy_std": float(np.std(scores["test_accuracy"])),
            "cv_f1_macro_mean": float(np.mean(scores["test_f1_macro"])),
            "cv_precision_macro_mean": float(np.mean(scores["test_precision_macro"])),
            "cv_recall_macro_mean": float(np.mean(scores["test_recall_macro"])),
            **artifacts,
            "learning_curve": {
                "train_sizes": train_sizes.tolist(),
                "train_accuracy_mean": train_scores.mean(axis=1).tolist(),
                "validation_accuracy_mean": valid_scores.mean(axis=1).tolist(),
            },
            "validation_curve": {
                "param_name": param_name,
                "param_range": param_range.tolist(),
                "train_accuracy_mean": validation_train.mean(axis=1).tolist(),
                "validation_accuracy_mean": validation_test.mean(axis=1).tolist(),
            },
        }
        trained_models[model_key] = fitted_model

    return results, trained_models


def train_neural_networks(
    split: SplitData,
    preprocessor: SharedPreprocessor,
    artifacts_dir: str | Path,
    timestamp: str,
    seed: int = SEED,
) -> tuple[dict[str, Any], dict[str, keras.Model]]:
    X_train = preprocessor.transform(split.X_train_raw)
    X_test = preprocessor.transform(split.X_test_raw)
    models_out: dict[str, keras.Model] = {}
    metrics_out: dict[str, Any] = {}

    for key in ("ann", "dnn"):
        tf.keras.backend.clear_session()
        model = build_neural_network(
            input_dim=X_train.shape[1],
            output_dim=len(LABELS),
            depth=key,
            seed=seed,
        )
        checkpoint_path = Path(artifacts_dir) / _versioned_name(f"{key}_checkpoint", timestamp, ".keras")
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss",
                patience=8,
                restore_best_weights=True,
                verbose=0,
            ),
            keras.callbacks.ModelCheckpoint(
                filepath=str(checkpoint_path),
                monitor="val_loss",
                save_best_only=True,
                verbose=0,
            ),
        ]
        history = model.fit(
            X_train,
            split.y_train_idx,
            validation_split=0.2,
            epochs=40,
            batch_size=32,
            shuffle=True,
            callbacks=callbacks,
            verbose=0,
        )
        y_pred = np.argmax(model.predict(X_test, verbose=0), axis=1)
        artifacts = _classification_artifacts(split.y_test_idx, y_pred)
        history_frame = pd.DataFrame(history.history)

        metrics_out[key] = {
            "model_type": "keras",
            **artifacts,
            "best_epoch": int(history_frame["val_loss"].idxmin() + 1),
            "history": {column: history_frame[column].round(6).tolist() for column in history_frame.columns},
        }
        models_out[key] = model

    return metrics_out, models_out


def train_kmeans(preprocessor: SharedPreprocessor, frame: pd.DataFrame, seed: int = SEED) -> dict[str, Any]:
    features = preprocessor.transform(frame[CATEGORICAL_COLUMNS + NUMERIC_COLUMNS])
    model = KMeans(n_clusters=3, random_state=seed, n_init=10)
    model.fit(features)
    return {"model": model, "n_clusters": int(model.n_clusters), "inertia": float(model.inertia_)}


def export_artifacts(
    artifacts_dir: str | Path,
    preprocessor: SharedPreprocessor,
    sklearn_models: dict[str, Any],
    keras_models: dict[str, keras.Model],
    kmeans_bundle: dict[str, Any],
    metrics: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    timestamp = config["timestamp"]
    artifacts_path = Path(artifacts_dir)
    artifacts_path.mkdir(parents=True, exist_ok=True)

    paths = ArtifactPaths(
        manifest=_versioned_name("artifact_manifest", timestamp, ".json"),
        encoder=_versioned_name("preprocessor_encoder", timestamp, ".joblib"),
        scaler=_versioned_name("preprocessor_scaler", timestamp, ".joblib"),
        feature_columns=_versioned_name("feature_columns", timestamp, ".joblib"),
        metadata=_versioned_name("training_metadata", timestamp, ".json"),
        experiment_log="experiment_log.jsonl",
        metrics=_versioned_name("model_metrics", timestamp, ".json"),
        random_forest_model=_versioned_name("crop_price_classifier_rf", timestamp, ".joblib"),
        gradient_boosting_model=_versioned_name("crop_price_classifier_gb", timestamp, ".joblib"),
        ann_model=_versioned_name("ann_model", timestamp, ".keras"),
        dnn_model=_versioned_name("dnn_model", timestamp, ".keras"),
        ann_checkpoint=_versioned_name("ann_checkpoint", timestamp, ".keras"),
        dnn_checkpoint=_versioned_name("dnn_checkpoint", timestamp, ".keras"),
        kmeans_model=_versioned_name("kmeans_clusterer", timestamp, ".joblib"),
    )

    joblib.dump(preprocessor.encoder, artifacts_path / paths.encoder)
    joblib.dump(preprocessor.scaler, artifacts_path / paths.scaler)
    joblib.dump(preprocessor.feature_columns, artifacts_path / paths.feature_columns)
    joblib.dump(sklearn_models["random_forest"], artifacts_path / paths.random_forest_model)
    joblib.dump(sklearn_models["gradient_boosting"], artifacts_path / paths.gradient_boosting_model)
    keras_models["ann"].save(artifacts_path / paths.ann_model)
    keras_models["dnn"].save(artifacts_path / paths.dnn_model)
    joblib.dump(kmeans_bundle["model"], artifacts_path / paths.kmeans_model)

    comparison_rows = []
    for model_key, payload in metrics.items():
        comparison_rows.append(
            {
                "model": model_key,
                "macro_f1": payload["macro_f1"],
                "weighted_f1": payload["weighted_f1"],
                "cv_accuracy_mean": payload.get("cv_accuracy_mean"),
                "cv_accuracy_std": payload.get("cv_accuracy_std"),
            }
        )

    metadata = {
        "timestamp": timestamp,
        "seed": config["seed"],
        "dataset_path": config["dataset_path"],
        "default_model": DEFAULT_MODEL_KEY,
        "labels": LABELS,
        "categorical_columns": CATEGORICAL_COLUMNS,
        "numeric_columns": NUMERIC_COLUMNS,
        "feature_columns": FEATURE_COLUMNS,
        "model_comparison_table": comparison_rows,
        "training_config": config,
    }
    manifest = {
        "timestamp": timestamp,
        "default_model": DEFAULT_MODEL_KEY,
        "labels": LABELS,
        "preprocessing": {
            "encoder_path": paths.encoder,
            "scaler_path": paths.scaler,
            "feature_columns_path": paths.feature_columns,
            "categorical_columns": CATEGORICAL_COLUMNS,
            "numeric_columns": NUMERIC_COLUMNS,
        },
        "models": {
            "random_forest": {"kind": "sklearn", "path": paths.random_forest_model},
            "gradient_boosting": {"kind": "sklearn", "path": paths.gradient_boosting_model},
            "ann": {"kind": "keras", "path": paths.ann_model},
            "dnn": {"kind": "keras", "path": paths.dnn_model},
        },
        "kmeans": {"kind": "sklearn", "path": paths.kmeans_model},
        "metadata_path": paths.metadata,
        "metrics_path": paths.metrics,
    }

    with open(artifacts_path / paths.metadata, "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)
    with open(artifacts_path / paths.metrics, "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    with open(artifacts_path / paths.manifest, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
    with open(artifacts_path / "artifact_manifest.json", "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
    with open(artifacts_path / paths.experiment_log, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(metadata) + "\n")

    return {"manifest": manifest, "metadata": metadata, "paths": asdict(paths)}


def run_training_pipeline(
    dataset_path: str | Path,
    artifacts_dir: str | Path,
    seed: int = SEED,
) -> dict[str, Any]:
    set_global_determinism(seed)
    timestamp = _utc_timestamp()
    frame = load_dataset(dataset_path)
    split = split_dataset(frame=frame, test_size=0.2, seed=seed)

    # Fit preprocessing only on training data to prevent leakage.
    preprocessor = SharedPreprocessor()
    preprocessor.fit(split.X_train_raw)

    sklearn_metrics, sklearn_models = evaluate_sklearn_models(
        models=build_sklearn_models(seed=seed),
        split=split,
        preprocessor=preprocessor,
        seed=seed,
    )
    keras_metrics, keras_models = train_neural_networks(
        split=split,
        preprocessor=preprocessor,
        artifacts_dir=artifacts_dir,
        timestamp=timestamp,
        seed=seed,
    )
    kmeans_bundle = train_kmeans(
        preprocessor=preprocessor,
        frame=frame,
        seed=seed,
    )

    metrics = {**sklearn_metrics, **keras_metrics}
    config = {
        "timestamp": timestamp,
        "seed": seed,
        "dataset_path": str(Path(dataset_path)),
        "python_version": sys.version,
        "tensorflow_version": tf.__version__,
        "numpy_version": np.__version__,
        "train_size": int(len(split.X_train_raw)),
        "test_size": int(len(split.X_test_raw)),
    }

    export_summary = export_artifacts(
        artifacts_dir=artifacts_dir,
        preprocessor=preprocessor,
        sklearn_models=sklearn_models,
        keras_models=keras_models,
        kmeans_bundle=kmeans_bundle,
        metrics=metrics,
        config=config,
    )

    return {
        "timestamp": timestamp,
        "metrics": metrics,
        "manifest": export_summary["manifest"],
        "metadata": export_summary["metadata"],
        "artifact_paths": export_summary["paths"],
    }
