"""
Minimal integration tests for the three core prediction endpoints.
Run: pytest backend/tests/test_api.py -v
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

# Patch heavy startup so tests don't require all model files
import unittest.mock as mock

with mock.patch("predict.load_artifacts"), \
     mock.patch("predict_image.load_models"), \
     mock.patch("database.init_db"):
    from main import app

client = TestClient(app, raise_server_exceptions=False)


# ── /predict ──────────────────────────────────────────────────────────────────
class TestPredict:
    def test_valid_input_returns_200(self):
        with mock.patch("predict.predict", return_value={
            "model_used": "random_forest", "model_version": "test",
            "prediction": 1, "prediction_label": "High",
            "recommendation": "SELL", "confidence": 0.9,
            "probabilities": {"Low": 0.05, "Medium": 0.05, "High": 0.9},
            "price_range_analysis": "Wide spread.", "market_insight": "Good market.",
            "cluster_id": 0, "cluster_distance": 1.2, "cluster_error": None,
            "feature_context": {}, "feature_contributions": [], "latency_ms": 5.0,
        }), mock.patch("database.save_prediction"):
            r = client.post("/predict", json={"min_price": 1200, "max_price": 1800})
        assert r.status_code == 200
        data = r.json()
        assert data["recommendation"] in ("SELL", "HOLD")
        assert 0.0 <= data["confidence"] <= 1.0

    def test_min_greater_than_max_returns_422(self):
        r = client.post("/predict", json={"min_price": 2000, "max_price": 1000})
        assert r.status_code == 422

    def test_negative_price_returns_422(self):
        r = client.post("/predict", json={"min_price": -100, "max_price": 1000})
        assert r.status_code == 422

    def test_invalid_model_type_returns_422(self):
        r = client.post("/predict?model_type=nonexistent", json={"min_price": 1000, "max_price": 2000})
        assert r.status_code == 422


# ── /predict-image ────────────────────────────────────────────────────────────
class TestPredictImage:
    def _make_minimal_jpeg(self) -> bytes:
        """1x1 white JPEG — smallest valid JPEG."""
        return (
            b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
            b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
            b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
            b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e\xc0'
            b'\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00'
            b'\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00'
            b'\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01'
            b'\x01\x00\x00?\x00\xfb\xd2\x8a(\x03\xff\xd9'
        )

    def test_valid_image_returns_200(self):
        with mock.patch("predict_image.predict_image", return_value={
            "freshness": "Fresh", "confidence": 0.95,
            "model_version": "test", "latency_ms": 40.0,
            "image_reason": "ok", "fruit_detected": True, "fruit_confidence": 0.8,
        }):
            r = client.post(
                "/predict-image",
                files={"file": ("test.jpg", self._make_minimal_jpeg(), "image/jpeg")},
            )
        assert r.status_code == 200
        assert r.json()["freshness"] in ("Fresh", "Rotten")

    def test_wrong_content_type_returns_415(self):
        r = client.post(
            "/predict-image",
            files={"file": ("test.txt", b"hello", "text/plain")},
        )
        assert r.status_code == 415

    def test_empty_file_returns_422(self):
        r = client.post(
            "/predict-image",
            files={"file": ("empty.jpg", b"", "image/jpeg")},
        )
        assert r.status_code == 422


# ── /smart-decision ───────────────────────────────────────────────────────────
class TestSmartDecision:
    def _jpeg(self) -> bytes:
        return b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9'

    def test_valid_request_returns_200(self):
        mock_result = {
            "fruit_detected": True, "fruit_confidence": 0.8,
            "fruit_classifier_top_index": 0, "fruit_reason": "ok",
            "freshness": "Fresh", "confidence": 0.9, "image_reason": "ok",
            "recommendation": "SELL", "should_hold": False,
            "hold_duration_days": 0, "hold_reason": "", "hold_instructions": "",
            "estimated_min_price": 2000.0, "estimated_max_price": 3000.0,
            "price_source": "dataset_median", "web_query": "", "price_source_reason": "",
            "price_prediction_label": "High", "price_prediction_code": 2,
            "price_probabilities": {}, "price_reason": "", "market_insight": "",
            "price_range_analysis": "", "image_price_reason": "", "decision_reason": "",
            "ml_model_used": "random_forest", "ml_model_version": "test",
            "cluster_id": 0, "cluster_distance": 1.0,
            "feature_context": {}, "feature_contributions": [],
            "pipeline_result": {}, "node_graph": {}, "workflow": [],
            "generated_analysis": "Test analysis.", "stage_explanations": [],
            "latency_ms": 60.0,
        }
        with mock.patch("smart_decision.decide", return_value=mock_result):
            r = client.post(
                "/smart-decision",
                files={"file": ("crop.jpg", self._jpeg(), "image/jpeg")},
            )
        assert r.status_code == 200

    def test_wrong_file_type_returns_415(self):
        r = client.post(
            "/smart-decision",
            files={"file": ("doc.pdf", b"%PDF", "application/pdf")},
        )
        assert r.status_code == 415
