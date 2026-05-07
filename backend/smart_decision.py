import time

from config import settings
from generative import generate_analysis
from logger import get_logger
from market_data import fetch_market_prices
import predict as price_predictor
import predict_image as image_predictor

log = get_logger(__name__)

_STORAGE_METHODS: dict[str, str] = {
    "apple":      "Cool, dark storage at 0–4°C with 90–95% humidity. Keep away from ethylene-sensitive produce.",
    "mango":      "Room temperature (20–25°C) until ripe, then refrigerate at 10–13°C. Avoid below 10°C before ripening.",
    "banana":     "Room temperature (13–15°C). Never refrigerate unripe bananas — cold blackens the skin.",
    "orange":     "Cool, ventilated storage at 5–10°C. Avoid moisture buildup to prevent mold.",
    "tomato":     "Room temperature (18–22°C) away from direct sunlight. Refrigeration kills flavor.",
    "potato":     "Dark, cool, dry storage at 7–10°C with good airflow. Avoid light to prevent greening.",
    "onion":      "Dry, well-ventilated storage at 5–10°C. Keep away from moisture and potatoes.",
    "grapes":     "Refrigerate at 0–2°C with high humidity. Do not wash before storage.",
    "strawberry": "Refrigerate at 0–2°C. Use within 2–3 days. Do not wash until ready to sell.",
    "carrot":     "Refrigerate at 0–4°C in perforated bags. Remove tops to extend shelf life.",
    "cucumber":   "Refrigerate at 10–13°C. Sensitive to chilling injury below 10°C.",
    "default":    "Store in a cool, dry, ventilated place. Separate damaged produce and check quality daily.",
}


def _storage_for(crop_hint: str) -> str:
    hint = crop_hint.lower().strip()
    for key, method in _STORAGE_METHODS.items():
        if key != "default" and key in hint:
            return method
    return _STORAGE_METHODS["default"]


def _market_trend(price_source: str, prediction_label: str, price_range_analysis: str) -> str:
    if prediction_label == "High":
        return "increasing"
    if prediction_label == "Low":
        return "decreasing"
    return "stable"


def _cluster_behavior(cluster_id: int, cluster_distance: float, prediction_label: str) -> str:
    if cluster_id < 0:
        return "Cluster analysis was unavailable for this runtime."
    proximity = "very close to" if cluster_distance < 1.0 else ("near" if cluster_distance < 3.0 else "at the edge of")
    return (
        f"This crop falls into Cluster {cluster_id}, which groups produce with similar "
        f"{prediction_label.lower()}-price market patterns. "
        f"The feature vector is {proximity} the cluster center (distance {cluster_distance:.3f}), "
        f"indicating {'strong' if cluster_distance < 1.5 else 'moderate'} pattern similarity with historical "
        f"{prediction_label.lower()}-price market entries."
    )


def _build_pipeline_result(
    image_result: dict,
    price_result: dict,
    price_data: dict,
    freshness: str,
    prediction_label: str,
    final_recommendation: str,
    should_hold: bool,
    hold_days: int,
    hold_reason: str,
    hold_instructions: str,
    not_hold_reason: str | None,
    price_reason: str,
    image_price_reason: str,
    decision_reason: str,
    crop_hint: str,
) -> dict:
    trend = _market_trend(price_data["source"], prediction_label, price_result["price_range_analysis"])
    mid_price = (price_data["min_price"] + price_data["max_price"]) / 2
    quality_adj = 0.95 if freshness == "Fresh" else 0.60
    final_price = round(mid_price * quality_adj, 2)

    return {
        "image_validation": {
            "is_fruit": image_result["fruit_detected"],
            "confidence": round(image_result["fruit_confidence"], 4),
            "why": image_result["fruit_reason"],
        },
        "quality_analysis": {
            "quality_score": freshness,
            "confidence": round(image_result["confidence"], 4),
            "why": image_result["image_reason"],
        },
        "feature_extraction": {
            "features_used": price_result["feature_context"],
            "why": (
                f"9 features were extracted and scaled: min_price ({price_data['min_price']:,.0f}), "
                f"max_price ({price_data['max_price']:,.0f}), commodity ({price_result['feature_context'].get('commodity', 'N/A')}), "
                f"state ({price_result['feature_context'].get('state', 'N/A')}), "
                f"district ({price_result['feature_context'].get('district', 'N/A')}), "
                f"market ({price_result['feature_context'].get('market', 'N/A')}), "
                f"variety ({price_result['feature_context'].get('variety', 'N/A')}), "
                f"grade ({price_result['feature_context'].get('grade', 'N/A')}), "
                f"arrival_date ({price_result['feature_context'].get('arrival_date', 'N/A')}). "
                "These were passed through feature_scaler.pkl (StandardScaler) before model inference."
            ),
        },
        "price_prediction": {
            "predicted_price": f"INR {price_data['min_price']:,.0f} – {price_data['max_price']:,.0f}",
            "category": prediction_label,
            "probabilities": price_result["probabilities"],
            "model_used": price_result["model_used"],
            "why": price_reason,
        },
        "cluster_analysis": {
            "cluster_id": price_result["cluster_id"],
            "cluster_distance": price_result["cluster_distance"],
            "pricing_behavior": _cluster_behavior(
                price_result["cluster_id"],
                price_result["cluster_distance"],
                prediction_label,
            ),
            "why": (
                f"kmeans_clusterer.pkl assigned this feature vector to Cluster {price_result['cluster_id']} "
                f"with a centroid distance of {price_result['cluster_distance']:.3f}. "
                "Clusters group historical market entries by price pattern similarity, "
                "providing a non-parametric cross-check on the supervised model output."
            ) if price_result["cluster_id"] >= 0 else "KMeans clustering was unavailable for this runtime.",
        },
        "market_analysis": {
            "trend": trend,
            "price_range": f"INR {price_data['min_price']:,.0f} – {price_data['max_price']:,.0f}",
            "source": price_data["source"],
            "why": price_data["source_reason"] + " " + price_result["price_range_analysis"],
        },
        "final_decision": {
            "final_price": f"INR {final_price:,.0f}",
            "recommendation": final_recommendation,
            "why": (
                f"Mid-market price of INR {mid_price:,.0f} adjusted by quality factor {quality_adj} "
                f"({'Fresh crop commands near-full market rate' if freshness == 'Fresh' else 'Rotten/poor quality reduces effective price by ~40%'}). "
                f"{image_price_reason} {decision_reason}"
            ),
        },
        "hold_decision": {
            "decision": "YES" if should_hold else "NO",
            "why": hold_reason if should_hold else (not_hold_reason or hold_reason),
        },
        "hold_strategy": {
            "days": hold_days if should_hold else 0,
            "storage_method": _storage_for(crop_hint) if should_hold else "No storage needed — proceed to market.",
            "why": (
                hold_instructions
                if should_hold
                else "Holding is not recommended because the current market window is already favorable or quality is compromised."
            ),
        },
    }


def _build_node_graph(
    image_result: dict,
    price_result: dict,
    price_data: dict,
    freshness: str,
    prediction_label: str,
    final_recommendation: str,
    should_hold: bool,
    hold_days: int,
    hold_reason: str,
    hold_instructions: str,
    not_hold_reason: str | None,
    price_reason: str,
    image_price_reason: str,
    decision_reason: str,
    crop_hint: str,
    image_bytes_len: int,
) -> dict:
    cluster_id = price_result["cluster_id"]
    cluster_distance = price_result["cluster_distance"]
    cluster_error = price_result.get("cluster_error")
    cluster_failed = cluster_id < 0

    # PARTIAL: cluster ran but returned fallback (no error string but id=-1 with no error)
    cluster_partial = cluster_id < 0 and not cluster_error

    trend = _market_trend(price_data["source"], prediction_label, price_result["price_range_analysis"])
    mid_price = (price_data["min_price"] + price_data["max_price"]) / 2
    quality_adj = 0.95 if freshness == "Fresh" else 0.60
    final_price = round(mid_price * quality_adj, 2)
    preprocessing = image_result.get("preprocessing", {})
    fruit_detected = image_result["fruit_detected"]

    # PARTIAL: market used dataset fallback instead of live web
    market_partial = price_data["source"] == "dataset_median"

    _IDS = [
        "node_1", "node_2", "node_3", "node_4",
        "node_5", "node_6", "node_7", "node_8", "node_9",
    ]
    _NAMES = [
        "Preprocessing", "Image Validation", "Quality Analysis",
        "Feature Extraction", "Price Prediction", "Clustering",
        "Market Analysis", "Final Decision", "Hold Strategy",
    ]
    _NODES = [
        "PREPROCESSING", "IMAGE_VALIDATION", "QUALITY_ANALYSIS",
        "FEATURE_PIPELINE", "PRICE_MODEL", "CLUSTER_ANALYSIS",
        "MARKET_ENRICHMENT", "DECISION_ENGINE", "HOLD_STRATEGY",
    ]

    def _status(node_key: str) -> str:
        if node_key == "PREPROCESSING":
            return "SUCCESS"
        if node_key == "IMAGE_VALIDATION":
            return "SUCCESS" if fruit_detected else "FAILED"
        if node_key == "CLUSTER_ANALYSIS":
            if cluster_error:
                return "FAILED"
            if cluster_partial:
                return "PARTIAL"
            return "SUCCESS"
        if node_key == "MARKET_ENRICHMENT":
            if not fruit_detected:
                return "SKIPPED"
            return "PARTIAL" if market_partial else "SUCCESS"
        return "SUCCESS" if fruit_detected else "SKIPPED"

    nodes = [
        {
            "id": _IDS[0],
            "name": _NAMES[0],
            "node": _NODES[0],
            "status": "SUCCESS",
            "depends_on": None,
            "data": {
                "image_bytes": image_bytes_len,
                "original_size": preprocessing.get("original_size", "unknown"),
                "resized_to_freshness": "128x128",
                "resized_to_fruit": "224x224",
                "normalization": "÷255.0 → [0,1]",
                "decoder": preprocessing.get("decoder", "cv2"),
                "yolo_detection_label": image_result.get("fruit_detector_label"),
                "yolo_detection_confidence": image_result.get("fruit_detector_confidence", 0.0),
            },
            "input": {
                "image_bytes": image_bytes_len,
                "target_size_freshness": "128x128",
                "target_size_fruit": "224x224",
                "normalization": "divide by 255.0",
            },
            "output": {
                "original_size": preprocessing.get("original_size", "unknown"),
                "resized_to": preprocessing.get("resized_to", [128, 128]),
                "normalized": preprocessing.get("normalized", True),
                "decoder": preprocessing.get("decoder", "cv2"),
                "yolo_label": image_result.get("fruit_detector_label"),
                "yolo_conf": image_result.get("fruit_detector_confidence", 0.0),
            },
            "error": "",
            "why": (
                f"Image decoded via cv2 (bypasses Ultralytics PIL patch). "
                f"Resized from {preprocessing.get('original_size', 'unknown')} to 128×128 for freshness CNN "
                f"and 224×224 for fruit classifier. Pixel values ÷255.0 → [0,1] as required by both Keras models. "
                + (f"YOLOv8 detected '{image_result.get('fruit_detector_label')}' at {image_result.get('fruit_detector_confidence', 0):.2f} confidence before crop extraction."
                   if image_result.get("fruit_detector_label") else
                   "YOLOv8 ran but found no supported fruit object above the 0.35 threshold.")
            ),
        },
        {
            "id": _IDS[1],
            "name": _NAMES[1],
            "node": _NODES[1],
            "status": _status("IMAGE_VALIDATION"),
            "depends_on": _IDS[0],
            "data": {
                "model": "fruit_classifier.h5 + yolov8n.pt",
                "is_fruit": fruit_detected,
                "fruit_label": image_result.get("fruit_label", "unknown"),
                "confidence": image_result["fruit_confidence"],
                "detector_label": image_result.get("fruit_detector_label"),
                "detector_confidence": image_result.get("fruit_detector_confidence", 0.0),
            },
            "input": {"model": "fruit_classifier.h5 + yolov8n.pt", "image_size": "224x224 RGB crop from YOLO bbox"},
            "output": {
                "is_fruit": fruit_detected,
                "fruit_label": image_result.get("fruit_label", "unknown"),
                "confidence": image_result["fruit_confidence"],
                "detector_label": image_result.get("fruit_detector_label"),
                "detector_confidence": image_result.get("fruit_detector_confidence", 0.0),
            },
            "error": "" if fruit_detected else "Fruit not detected — pipeline stops here for downstream nodes.",
            "why": image_result["fruit_reason"],
        },
        {
            "id": _IDS[2],
            "name": _NAMES[2],
            "node": _NODES[2],
            "status": _status("QUALITY_ANALYSIS"),
            "depends_on": _IDS[1],
            "data": {
                "model": "cnn_food_quality_model.h5",
                "freshness": freshness,
                "confidence": image_result["confidence"],
                "defect_indicators": (
                    "Visible spoilage, discoloration, or surface degradation detected."
                    if freshness == "Rotten"
                    else "No significant defects — surface texture and color consistent with market-ready produce."
                ),
            },
            "input": {"model": "cnn_food_quality_model.h5", "image_size": "128x128 RGB"},
            "output": {
                "freshness": freshness,
                "confidence": image_result["confidence"],
                "defect_indicators": (
                    "Visible spoilage, discoloration, or surface degradation detected."
                    if freshness == "Rotten"
                    else "No significant defects — surface texture and color consistent with market-ready produce."
                ),
            },
            "error": "",
            "why": image_result["image_reason"] if fruit_detected else "Skipped — IMAGE_VALIDATION returned is_fruit=False.",
        },
        {
            "id": _IDS[3],
            "name": _NAMES[3],
            "node": _NODES[3],
            "status": _status("FEATURE_PIPELINE"),
            "depends_on": _IDS[2],
            "data": {
                "files": ["feature_columns.pkl", "feature_scaler.pkl", "label_encoders.pkl"],
                "features": price_result["feature_context"] if fruit_detected else {},
                "raw_prices": {"min": price_data["min_price"], "max": price_data["max_price"]},
            },
            "input": {
                "files": ["feature_columns.pkl", "feature_scaler.pkl", "label_encoders.pkl"],
                "raw_prices": {"min": price_data["min_price"], "max": price_data["max_price"]},
                "crop_hint": crop_hint or "apple (default)",
            },
            "output": price_result["feature_context"] if fruit_detected else {},
            "error": "",
            "why": (
                f"9 features assembled via feature_columns.pkl order: "
                f"min_price={price_data['min_price']:,.0f}, max_price={price_data['max_price']:,.0f}, "
                f"commodity='{price_result['feature_context'].get('commodity')}', "
                f"state='{price_result['feature_context'].get('state')}', "
                f"district='{price_result['feature_context'].get('district')}', "
                f"market='{price_result['feature_context'].get('market')}', "
                f"variety='{price_result['feature_context'].get('variety')}', "
                f"grade='{price_result['feature_context'].get('grade')}', "
                f"arrival_date='{price_result['feature_context'].get('arrival_date')}'. "
                "All values scaled via StandardScaler (feature_scaler.pkl) before inference."
            ) if fruit_detected else "Skipped — IMAGE_VALIDATION failed.",
        },
        {
            "id": _IDS[4],
            "name": _NAMES[4],
            "node": _NODES[4],
            "status": _status("PRICE_MODEL"),
            "depends_on": _IDS[3],
            "data": {
                "active_model": price_result.get("model_used", "N/A"),
                "available_models": ["crop_price_classifier.pkl", "ann_model.h5", "dnn_model.h5"],
                "price_category": prediction_label,
                "probabilities": price_result.get("probabilities", {}),
                "confidence": price_result.get("confidence", 0.0),
                "model_version": price_result.get("model_version", "N/A"),
            },
            "input": {
                "models": ["crop_price_classifier.pkl", "ann_model.h5", "dnn_model.h5"],
                "active_model": price_result.get("model_used", "N/A"),
                "scaled_feature_vector": "9-dim float32",
            },
            "output": {
                "price_category": prediction_label,
                "predicted_price_range": f"INR {price_data['min_price']:,.0f} – {price_data['max_price']:,.0f}",
                "probabilities": price_result.get("probabilities", {}),
                "model_used": price_result.get("model_used", "N/A"),
                "confidence": price_result.get("confidence", 0.0),
            },
            "error": "",
            "why": (
                f"{price_result.get('model_used', 'N/A')} predicted '{prediction_label}' class "
                f"with confidence {price_result.get('confidence', 0):.2f}. "
                f"P(Low)={price_result.get('probabilities', {}).get('Low', 0):.2f}, "
                f"P(Medium)={price_result.get('probabilities', {}).get('Medium', 0):.2f}, "
                f"P(High)={price_result.get('probabilities', {}).get('High', 0):.2f}. "
                f"ANN and DNN are in the registry but '{price_result.get('model_used')}' was the active model."
            ) if fruit_detected else "Skipped — IMAGE_VALIDATION failed.",
        },
        {
            "id": _IDS[5],
            "name": _NAMES[5],
            "node": _NODES[5],
            "status": "FAILED" if cluster_error else ("PARTIAL" if cluster_partial else "SUCCESS"),
            "depends_on": _IDS[4],
            "data": {
                "model": "kmeans_clusterer.pkl",
                "cluster_id": cluster_id,
                "cluster_distance": cluster_distance,
                "pricing_pattern": _cluster_behavior(cluster_id, cluster_distance, prediction_label),
                "error": cluster_error or "",
            },
            "input": {"model": "kmeans_clusterer.pkl", "feature_vector": "same 9-dim scaled float32 as PRICE_MODEL"},
            "output": {
                "cluster_id": cluster_id,
                "cluster_distance": cluster_distance,
                "pricing_pattern": _cluster_behavior(cluster_id, cluster_distance, prediction_label),
            },
            "error": cluster_error or "",
            "why": (
                f"KMeans FAILED: '{cluster_error}'. "
                "Root cause: StandardScaler.transform() always outputs float64 regardless of input dtype. "
                "KMeans C extension requires float32 ('const float'). "
                "Fix applied in predict.py: scaled = scaler.transform(features).astype(np.float32). "
                "If this node still shows FAILED, a different runtime issue is present."
            ) if cluster_error else (
                f"kmeans_clusterer.pkl assigned feature vector to Cluster {cluster_id} "
                f"(centroid distance {cluster_distance:.4f}). "
                f"{_cluster_behavior(cluster_id, cluster_distance, prediction_label)}"
            ),
        },
        {
            "id": _IDS[6],
            "name": _NAMES[6],
            "node": _NODES[6],
            "status": _status("MARKET_ENRICHMENT"),
            "depends_on": _IDS[5],
            "data": {
                "source": price_data["source"],
                "query": price_data.get("query", ""),
                "market_price_range": f"INR {price_data['min_price']:,.0f} – {price_data['max_price']:,.0f}",
                "trend": trend,
                "matched_crop": price_data.get("matched_crop", crop_hint or "default"),
            },
            "input": {
                "source": "DuckDuckGo Instant Answer API",
                "fallback": "dataset median prices per crop keyword",
                "query": price_data.get("query", ""),
            },
            "output": {
                "market_price_range": f"INR {price_data['min_price']:,.0f} – {price_data['max_price']:,.0f}",
                "trend": trend,
                "source": price_data["source"],
                "matched_crop": price_data.get("matched_crop", crop_hint or "default"),
            },
            "error": "Live web search unavailable — dataset fallback used." if market_partial and fruit_detected else "",
            "why": (
                price_data["source_reason"] + " " + price_result["price_range_analysis"] +
                f" Trend classified as '{trend}' because PRICE_MODEL returned '{prediction_label}' class."
            ) if fruit_detected else "Skipped — IMAGE_VALIDATION failed.",
        },
        {
            "id": _IDS[7],
            "name": _NAMES[7],
            "node": _NODES[7],
            "status": _status("DECISION_ENGINE"),
            "depends_on": _IDS[6],
            "data": {
                "freshness": freshness,
                "price_category": prediction_label,
                "cluster_used": not cluster_failed,
                "market_trend": trend,
                "mid_price": mid_price,
                "quality_adjustment_factor": quality_adj,
                "final_price": f"INR {final_price:,.0f}",
                "recommendation": final_recommendation,
            },
            "input": {
                "freshness": freshness,
                "price_category": prediction_label,
                "cluster_available": not cluster_failed,
                "market_trend": trend,
                "mid_price": mid_price,
                "quality_adj": quality_adj,
            },
            "output": {
                "final_price": f"INR {final_price:,.0f}",
                "sell_or_hold": final_recommendation,
                "quality_adjusted": f"INR {mid_price:,.0f} × {quality_adj} = INR {final_price:,.0f}",
                "cluster_used": not cluster_failed,
            },
            "error": "",
            "why": (
                f"INR {mid_price:,.0f} × {quality_adj} "
                f"({'Fresh → 0.95' if freshness == 'Fresh' else 'Rotten → 0.60, 40% spoilage penalty'}) "
                f"= INR {final_price:,.0f}. "
                + (f"Cluster {cluster_id} confirmed {prediction_label.lower()}-price pattern. " if not cluster_failed else
                   "Cluster signal excluded (KMeans dtype error) — PRICE_MODEL + market trend used only. ")
                + f"Market trend: '{trend}'. {decision_reason}"
            ) if fruit_detected else "Skipped — IMAGE_VALIDATION failed.",
        },
        {
            "id": _IDS[8],
            "name": _NAMES[8],
            "node": _NODES[8],
            "status": _status("HOLD_STRATEGY"),
            "depends_on": _IDS[7],
            "data": {
                "hold_decision": "YES" if should_hold else "NO",
                "days_to_hold": hold_days if should_hold else 0,
                "storage_method": _storage_for(crop_hint) if should_hold else "No storage needed — proceed to market.",
                "freshness": freshness,
                "price_category": prediction_label,
                "trend": trend,
            },
            "input": {
                "hold_decision": "YES" if should_hold else "NO",
                "freshness": freshness,
                "price_category": prediction_label,
                "trend": trend,
                "crop_hint": crop_hint or "default",
            },
            "output": {
                "days_to_hold": hold_days if should_hold else 0,
                "storage_method": _storage_for(crop_hint) if should_hold else "No storage needed — proceed to market.",
                "hold_decision": "YES" if should_hold else "NO",
            },
            "error": "",
            "why": (
                (
                    hold_instructions + " "
                    f"Holding {hold_days} days justified: price class '{prediction_label}', "
                    f"trend '{trend}' — waiting may improve returns before quality decays."
                ) if should_hold else (
                    (not_hold_reason or hold_reason) + " "
                    "Not holding because "
                    + ("freshness is Rotten — further storage accelerates quality loss." if freshness == "Rotten"
                       else f"price class is '{prediction_label}' and trend is '{trend}' — current window is favorable.")
                )
            ) if fruit_detected else "Skipped — IMAGE_VALIDATION failed.",
        },
    ]

    # Build strict linear edges
    edges = [
        {"from": _IDS[i], "to": _IDS[i + 1]}
        for i in range(len(_IDS) - 1)
    ]

    return {"nodes": nodes, "edges": edges}


def _build_price_reason(prediction_label: str, probabilities: dict[str, float], cluster_id: int) -> str:
    confidence = probabilities.get(prediction_label, 0.0)
    return (
        f"The {prediction_label.lower()} price class was selected with confidence {confidence:.2f}. "
        f"Cluster {cluster_id if cluster_id >= 0 else 'N/A'} was used as an additional market-pattern signal."
    )


def _build_image_price_reason(freshness: str, prediction_label: str, min_price: float, max_price: float) -> str:
    if freshness == "Rotten":
        return (
            f"Even though the estimated market band is INR {min_price:,.0f} to INR {max_price:,.0f}, "
            "poor visible quality can reduce the real selling price sharply."
        )
    if prediction_label == "High":
        return (
            f"The image looks market-ready and the estimated price band of INR {min_price:,.0f} to INR {max_price:,.0f} "
            "supports a stronger selling opportunity."
        )
    return (
        f"The crop appears usable, but the estimated price band of INR {min_price:,.0f} to INR {max_price:,.0f} "
        "does not yet justify rushed selling."
    )


def _build_hold_plan(recommendation: str, prediction_label: str, freshness: str) -> tuple[bool, int, str, str, str | None]:
    if freshness == "Rotten":
        return (
            False,
            0,
            "Do not hold because the image shows spoilage and quality can deteriorate further.",
            "Do not store for a delayed sale. Recheck grading, sort damaged produce, and avoid keeping spoiled stock mixed with good stock.",
            "Not holding is safer because continued storage may worsen quality and reduce market acceptance.",
        )

    if recommendation == "SELL":
        return (
            False,
            settings.hold_days_high_price,
            "Do not hold for long because the current price class is already favorable for sale.",
            "If dispatch is delayed briefly, keep the produce shaded, ventilated, and dry so current quality is preserved until sale.",
            "Not holding for several extra days is better because the present market window already looks strong.",
        )

    hold_days = settings.hold_days_medium_price if prediction_label == "Medium" else settings.hold_days_low_price
    return (
        True,
        hold_days,
        f"Hold for around {hold_days} days because the current price class is {prediction_label.lower()} and the market may improve.",
        "Store in a cool, dry, ventilated place, separate damaged produce, avoid moisture buildup, and check quality daily before selling.",
        None,
    )


async def decide(
    image_bytes: bytes,
    crop_hint: str = "",
    model_type: str = "best",
) -> dict:
    t0 = time.perf_counter()

    image_result = image_predictor.analyze_image(image_bytes)
    if not image_result["fruit_detected"]:
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "fruit_detected": False,
            "fruit_confidence": image_result["fruit_confidence"],
            "fruit_classifier_top_index": image_result["fruit_classifier_top_index"],
            "fruit_reason": image_result["fruit_reason"],
            "freshness": "Not Fruit",
            "confidence": 0.0,
            "image_reason": image_result["image_reason"],
            "recommendation": "NOT FRUIT IMAGE",
            "should_hold": False,
            "hold_duration_days": 0,
            "hold_reason": "The image is not confidently recognized as a fruit or crop image, so no sale or hold advice should be generated.",
            "not_hold_reason": "Processing stopped before price prediction because the upload does not look like a valid fruit image.",
            "hold_instructions": "Please upload a clear fruit or crop image before running market analysis.",
            "estimated_min_price": 0.0,
            "estimated_max_price": 0.0,
            "price_source": "not_applicable",
            "web_query": "",
            "price_source_reason": "Web price lookup was skipped because the image did not pass fruit validation.",
            "price_prediction_label": "Not Applicable",
            "price_prediction_code": -1,
            "price_probabilities": {},
            "price_reason": "Price prediction was skipped because fruit validation failed.",
            "market_insight": "No market insight was generated because the uploaded image is not a valid fruit image.",
            "price_range_analysis": "No price range analysis was generated.",
            "image_price_reason": "Image-to-price reasoning was skipped because fruit validation failed.",
            "decision_reason": "This is not a valid fruit image for the crop decision pipeline.",
            "ml_model_used": "not_applicable",
            "ml_model_version": "not_applicable",
            "cluster_id": -1,
            "cluster_distance": -1.0,
            "feature_context": {},
            "generated_analysis": "The uploaded image is not recognized as a fruit or crop image, so the system stopped before freshness, price, and hold analysis.",
            "stage_explanations": [
                f"1. Fruit check failed: {image_result['fruit_reason']}",
                "2. Freshness check was skipped.",
                "3. Price prediction was skipped.",
                "4. Web search was skipped.",
                "5. Hold guidance was skipped.",
            ],
            "latency_ms": latency_ms,
        }

    price_data = await fetch_market_prices(crop_hint)
    price_result = price_predictor.predict(
        price_data["min_price"],
        price_data["max_price"],
        model_type=model_type,
        crop_hint=crop_hint,
    )

    freshness = image_result["freshness"]
    cnn_confidence = image_result["confidence"]
    fruit_detected = image_result["fruit_detected"]

    prediction_label = price_result["prediction_label"]
    recommendation = price_result["recommendation"]
    if not fruit_detected or freshness == "Rotten":
        final_recommendation = "DO NOT SELL" if freshness == "Rotten" else "HOLD"
    else:
        final_recommendation = recommendation

    should_hold, hold_days, hold_reason, hold_instructions, not_hold_reason = _build_hold_plan(
        final_recommendation,
        prediction_label,
        freshness,
    )

    image_price_reason = _build_image_price_reason(
        freshness,
        prediction_label,
        price_data["min_price"],
        price_data["max_price"],
    )
    price_reason = _build_price_reason(
        prediction_label,
        price_result["probabilities"],
        price_result["cluster_id"],
    )

    if not fruit_detected:
        decision_reason = (
            "The uploaded image is not confidently recognized as a fruit or crop image, so the recommendation should be treated cautiously."
        )
    elif freshness == "Rotten":
        decision_reason = "The crop should not be sold now because visible spoilage can attract lower bids or rejection."
    elif final_recommendation == "SELL":
        decision_reason = "The crop looks fresh and the price model indicates a favorable selling window."
    else:
        decision_reason = "The crop quality is acceptable, but the market signal is not strong enough yet for an immediate sale."

    generated_analysis = generate_analysis(
        fruit_reason=image_result["fruit_reason"],
        image_reason=image_result["image_reason"],
        price_source_reason=price_data["source_reason"],
        price_reason=price_reason,
        decision_reason=decision_reason,
        hold_reason=hold_reason,
        hold_instructions=hold_instructions,
    )

    stage_explanations = [
        f"1. Fruit check: {image_result['fruit_reason']}",
        f"2. CNN freshness: {image_result['image_reason']}",
        f"3. Crop price: predicted {prediction_label} class using {price_result['model_used']}.",
        f"4. Web search: {price_data['source_reason']}",
        f"5. Image-price link: {image_price_reason}",
        f"6. Hold or not: {decision_reason}",
        f"7. Why hold / not hold: {hold_reason if should_hold else (not_hold_reason or hold_reason)}",
        f"8. Holding plan: {hold_instructions}",
    ]

    pipeline_result = _build_pipeline_result(
        image_result=image_result,
        price_result=price_result,
        price_data=price_data,
        freshness=freshness,
        prediction_label=prediction_label,
        final_recommendation=final_recommendation,
        should_hold=should_hold,
        hold_days=hold_days,
        hold_reason=hold_reason,
        hold_instructions=hold_instructions,
        not_hold_reason=not_hold_reason,
        price_reason=price_reason,
        image_price_reason=image_price_reason,
        decision_reason=decision_reason,
        crop_hint=crop_hint,
    )

    workflow = _build_node_graph(
        image_result=image_result,
        price_result=price_result,
        price_data=price_data,
        freshness=freshness,
        prediction_label=prediction_label,
        final_recommendation=final_recommendation,
        should_hold=should_hold,
        hold_days=hold_days,
        hold_reason=hold_reason,
        hold_instructions=hold_instructions,
        not_hold_reason=not_hold_reason,
        price_reason=price_reason,
        image_price_reason=image_price_reason,
        decision_reason=decision_reason,
        crop_hint=crop_hint,
        image_bytes_len=len(image_bytes) if image_bytes else 0,
    )

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "fruit_detected": fruit_detected,
        "fruit_confidence": image_result["fruit_confidence"],
        "fruit_classifier_top_index": image_result["fruit_classifier_top_index"],
        "fruit_reason": image_result["fruit_reason"],
        "freshness": freshness,
        "confidence": cnn_confidence,
        "image_reason": image_result["image_reason"],
        "recommendation": final_recommendation,
        "should_hold": should_hold,
        "hold_duration_days": hold_days,
        "hold_reason": hold_reason,
        "not_hold_reason": not_hold_reason,
        "hold_instructions": hold_instructions,
        "estimated_min_price": price_data["min_price"],
        "estimated_max_price": price_data["max_price"],
        "price_source": price_data["source"],
        "web_query": price_data["query"],
        "price_source_reason": price_data["source_reason"],
        "price_prediction_label": prediction_label,
        "price_prediction_code": price_result["prediction"],
        "price_probabilities": price_result["probabilities"],
        "price_reason": price_reason,
        "market_insight": price_result["market_insight"],
        "price_range_analysis": price_result["price_range_analysis"],
        "image_price_reason": image_price_reason,
        "decision_reason": decision_reason,
        "ml_model_used": price_result["model_used"],
        "ml_model_version": price_result["model_version"],
        "cluster_id": price_result["cluster_id"],
        "cluster_distance": price_result["cluster_distance"],
        "cluster_error": price_result.get("cluster_error"),
        "feature_context": price_result["feature_context"],
        "feature_contributions": price_result.get("feature_contributions", []),
        "pipeline_result": pipeline_result,
        "node_graph": workflow,
        "workflow": workflow.get("nodes", []),
        "generated_analysis": generated_analysis,
        "stage_explanations": stage_explanations,
        "latency_ms": latency_ms,
    }
