"""
Smart decision engine v2.
Pipeline:
  1. CNN  → freshness + confidence
  2. Web search → live market prices (min/max)
  3. ML model → SELL / HOLD from live prices
  4. Decision rule → final recommendation
  5. Generative layer → AI narrative paragraph
"""

import time

from logger import get_logger
from market_data import fetch_market_prices
from generative import generate_analysis
import predict as price_predictor
import predict_image as image_predictor

log = get_logger(__name__)


async def decide(
    image_bytes: bytes,
    crop_hint: str = "",
    model_type: str = "best",
) -> dict:
    t0 = time.perf_counter()

    # ── Step 1: CNN freshness ─────────────────────────────────────────────────
    image_result = image_predictor.predict_image(image_bytes)
    freshness: str          = image_result["freshness"]
    cnn_confidence: float   = image_result["confidence"]

    # ── Step 2: Live market prices ────────────────────────────────────────────
    price_data = await fetch_market_prices(crop_hint)
    min_price: float  = price_data["min_price"]
    max_price: float  = price_data["max_price"]
    price_source: str = price_data["source"]

    # ── Step 3: ML price prediction ───────────────────────────────────────────
    price_result        = price_predictor.predict(min_price, max_price, model_type=model_type)
    ml_recommendation   = price_result["recommendation"]
    market_insight      = price_result["market_insight"]
    price_range_analysis = price_result["price_range_analysis"]
    ml_model_used       = price_result["model_used"]

    # ── Step 4: Final decision ────────────────────────────────────────────────
    final_recommendation = "DO NOT SELL" if freshness == "Rotten" else ml_recommendation

    # ── Step 5: Generative analysis ───────────────────────────────────────────
    generated_analysis = generate_analysis(
        freshness=freshness,
        confidence=cnn_confidence,
        recommendation=final_recommendation,
        min_price=min_price,
        max_price=max_price,
        market_insight=market_insight,
        price_source=price_source,
        crop_hint=crop_hint,
    )

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    log.info("Smart decision complete", extra={
        "freshness": freshness,
        "cnn_confidence": cnn_confidence,
        "price_source": price_source,
        "min_price": min_price,
        "max_price": max_price,
        "ml_recommendation": ml_recommendation,
        "final_recommendation": final_recommendation,
        "latency_ms": latency_ms,
    })

    return {
        "freshness": freshness,
        "confidence": cnn_confidence,
        "recommendation": final_recommendation,
        "estimated_min_price": min_price,
        "estimated_max_price": max_price,
        "price_source": price_source,
        "market_insight": market_insight,
        "price_range_analysis": price_range_analysis,
        "ml_model_used": ml_model_used,
        "generated_analysis": generated_analysis,
        "latency_ms": latency_ms,
    }
