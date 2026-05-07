from typing import Literal

from pydantic import BaseModel, Field, model_validator

from config import settings

ModelType = Literal["random_forest", "gradient_boosting", "ann", "dnn", "best"]


class PredictRequest(BaseModel):
    min_price: float = Field(..., gt=settings.min_price_floor, le=settings.min_price_ceiling)
    max_price: float = Field(..., gt=settings.max_price_floor, le=settings.max_price_ceiling)

    @model_validator(mode="after")
    def check_price_order(self) -> "PredictRequest":
        if self.min_price > self.max_price:
            raise ValueError("min_price must be less than or equal to max_price.")
        return self


class PredictResponse(BaseModel):
    model_used: str
    model_version: str
    prediction: int
    prediction_label: str
    recommendation: str
    confidence: float
    probabilities: dict[str, float]
    price_range_analysis: str
    market_insight: str
    cluster_id: int
    cluster_distance: float
    feature_context: dict[str, str]
    feature_contributions: list[dict] = []
    latency_ms: float


class SmartDecisionResponse(BaseModel):
    fruit_detected: bool
    fruit_confidence: float
    fruit_classifier_top_index: int
    fruit_reason: str
    freshness: str
    confidence: float
    image_reason: str
    recommendation: str
    should_hold: bool
    hold_duration_days: int
    hold_reason: str
    not_hold_reason: str | None = None
    hold_instructions: str
    estimated_min_price: float
    estimated_max_price: float
    price_source: str
    web_query: str
    price_source_reason: str
    price_prediction_label: str
    price_prediction_code: int
    price_probabilities: dict[str, float]
    price_reason: str
    market_insight: str
    price_range_analysis: str
    image_price_reason: str
    decision_reason: str
    ml_model_used: str
    ml_model_version: str
    cluster_id: int
    cluster_distance: float
    cluster_error: str | None = None
    feature_context: dict[str, str]
    feature_contributions: list[dict] = []
    pipeline_result: dict = {}
    node_graph: dict = {}
    workflow: list[dict] = []
    generated_analysis: str
    stage_explanations: list[str]
    latency_ms: float


class ImagePredictResponse(BaseModel):
    freshness: str
    confidence: float
    model_version: str
    latency_ms: float
    image_reason: str | None = None
    fruit_detected: bool | None = None
    fruit_confidence: float | None = None


class ClusterPoint(BaseModel):
    cluster_id: int
    min_price: float
    max_price: float
    modal_price: float
    commodity: str
    state: str


class ClustersResponse(BaseModel):
    clusters: list[ClusterPoint]
    k: int
    silhouette_score: float
    note: str


class ModelMetricsResponse(BaseModel):
    metrics: list[dict]


class HealthResponse(BaseModel):
    status: str
    app_version: str
    default_model: str
    models: list[dict]
    cnn_model: dict | None = None
