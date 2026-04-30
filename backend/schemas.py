from typing import Literal
from pydantic import BaseModel, Field, model_validator

from config import settings

ModelType = Literal["random_forest", "gradient_boosting", "ann", "best"]


class PredictRequest(BaseModel):
    min_price: float = Field(
        ...,
        gt=settings.min_price_floor,
        le=settings.min_price_ceiling,
        description="Minimum market price (INR)",
    )
    max_price: float = Field(
        ...,
        gt=settings.max_price_floor,
        le=settings.max_price_ceiling,
        description="Maximum market price (INR)",
    )

    @model_validator(mode="after")
    def check_price_order(self) -> "PredictRequest":
        if self.min_price > self.max_price:
            raise ValueError("min_price must be less than or equal to max_price.")
        return self


class PredictResponse(BaseModel):
    model_used: str
    model_version: str
    prediction: int           # 0 or 1
    recommendation: str       # "SELL" or "HOLD"
    confidence: float         # 0.0 – 1.0
    price_range_analysis: str
    market_insight: str
    latency_ms: float


class SmartDecisionResponse(BaseModel):
    freshness: str
    confidence: float
    recommendation: str           # "SELL", "HOLD", or "DO NOT SELL"
    estimated_min_price: float
    estimated_max_price: float
    price_source: str             # "web_search" or "dataset_median"
    market_insight: str
    price_range_analysis: str
    ml_model_used: str
    generated_analysis: str       # AI narrative paragraph
    latency_ms: float


class ImagePredictResponse(BaseModel):
    freshness: str        # "Fresh" or "Rotten"
    confidence: float     # 0.0 – 1.0
    model_version: str
    latency_ms: float


class HealthResponse(BaseModel):
    status: str
    app_version: str
    default_model: str
    models: list[dict]
    cnn_model: dict | None = None
