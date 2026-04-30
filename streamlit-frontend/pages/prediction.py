import streamlit as st

from components.cards import hero_header, info_card, kpi_card, section_header, stat_strip
from services.api import predict_crop_price
from services.local_model import predict_local_recommendation
from utils.data_loader import load_crop_dataset


MODEL_OPTIONS = ["best", "random_forest", "gradient_boosting", "ann"]


def render() -> None:
    with st.spinner("Loading model-ready market context..."):
        df = load_crop_dataset()

    hero_header(
        "Prediction Workspace",
        "Fill in crop and market context, review the suggested price range, and generate a fast prediction with a highlighted result panel.",
        "🌾 Fast Price Decision Assistant",
    )
    stat_strip(
        [
            ("Form Mode", "Interactive"),
            ("Inference Path", "Local + API"),
            ("Result", "Estimated Price + Action"),
        ]
    )

    crop_options = sorted(df["commodity"].dropna().unique().tolist())
    state_options = sorted(df["state"].dropna().unique().tolist())

    with st.form("prediction_form"):
        left, right = st.columns(2)
        with left:
            crop = st.selectbox("Crop", crop_options)
            state = st.selectbox("Region / State", state_options)
            state_df = df[df["state"] == state]
            district = st.selectbox("District", sorted(state_df["district"].dropna().unique().tolist()))
            district_df = state_df[state_df["district"] == district]
            market = st.selectbox("Market", sorted(district_df["market"].dropna().unique().tolist()))
        with right:
            market_df = district_df[district_df["market"] == market]
            crop_df = market_df[market_df["commodity"] == crop]
            fallback_df = df[df["commodity"] == crop]
            active_df = crop_df if not crop_df.empty else fallback_df

            season = st.selectbox(
                "Season / Arrival Month",
                sorted(active_df["arrival_month"].dropna().unique().tolist()) if not active_df.empty else ["Mar"],
            )
            model_type = st.selectbox("Model", MODEL_OPTIONS, index=0)
            default_min = float(active_df["min_price"].median()) if not active_df.empty else 1200.0
            default_max = float(active_df["max_price"].median()) if not active_df.empty else 1800.0
            min_price = st.number_input("Minimum Price (INR)", min_value=1.0, value=default_min, step=50.0)
            max_price = st.number_input("Maximum Price (INR)", min_value=1.0, value=default_max, step=50.0)

        submitted = st.form_submit_button("Predict Crop Price", use_container_width=True, type="primary")

    section_header("Prediction Notes", "The current exported model uses price-range features, while crop and region selections guide the context and price estimate.", "🧭")
    info_card(
        "How this works",
        "Crop, region, district, market, and season narrow the historical context. The classifier predicts SELL or HOLD from min and max price, and the page estimates an expected modal price from matching historical records.",
        "ℹ️",
    )

    if submitted:
        if min_price > max_price:
            st.error("Minimum price must be less than or equal to maximum price.")
            return

        context_df = active_df[active_df["arrival_month"] == season] if "active_df" in locals() else df[df["commodity"] == crop]
        if context_df.empty:
            context_df = active_df if not active_df.empty else df[df["commodity"] == crop]

        estimated_price = float(context_df["modal_price"].mean()) if not context_df.empty else (min_price + max_price) / 2

        with st.spinner("Running prediction..."):
            api_result = predict_crop_price(min_price=min_price, max_price=max_price, model_type=model_type)
            local_result = predict_local_recommendation(min_price=min_price, max_price=max_price)
        result = api_result if not api_result.get("error") else local_result

        section_header("Prediction Result", "Highlighted output for the selected crop market context.", "🚜")
        st.success(
            f"Estimated modal crop price: ₹{estimated_price:,.0f} | Recommendation: {result['recommendation']}"
        )

        r1, r2, r3 = st.columns(3)
        with r1:
            kpi_card("Crop", crop, "Selected commodity", "🧺")
        with r2:
            confidence_value = result.get("confidence")
            confidence_text = f"{confidence_value * 100:.1f}%" if isinstance(confidence_value, (float, int)) else "N/A"
            kpi_card("Confidence", confidence_text, "Probability-like score", "🎯")
        with r3:
            kpi_card("Estimated Price", f"₹{estimated_price:,.0f}", "Historical modal estimate", "💰")

        info_left, info_right = st.columns(2)
        with info_left:
            info_card(
                "Input Summary",
                f"{crop} in {market}, {district}, {state} during {season} with min price ₹{min_price:,.0f} and max price ₹{max_price:,.0f}.",
                "📝",
            )
        with info_right:
            fallback_note = "Served from local model artifact." if api_result.get("error") else "Served from backend API."
            info_card(
                "Prediction Source",
                fallback_note,
                "⚡",
            )

        if api_result.get("error"):
            st.warning(f"Backend request was unavailable. Falling back to cached local model. Details: {api_result['error']}")

        if not api_result.get("error"):
            detail_left, detail_right = st.columns(2)
            with detail_left:
                info_card("Price Range Analysis", api_result["price_range_analysis"], "📉")
            with detail_right:
                info_card("Market Insight", api_result["market_insight"], "💡")
