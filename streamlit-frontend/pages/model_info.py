import streamlit as st

from components.cards import hero_header, info_card, kpi_card, section_header, stat_strip
from services.api import get_health


def render() -> None:
    health = get_health()

    hero_header(
        "Model Information",
        "Review the deployed model family, understand how the training pipeline works, and inspect the input-output contract used by the dashboard.",
        "🧠 Technical Model Dashboard",
    )
    stat_strip(
        [
            ("Deployed Type", "ML Classifier"),
            ("Active Backend", "Healthy" if health else "Offline"),
            ("Notebook Benchmarks", "Available"),
        ]
    )

    section_header("Model Snapshot", "High-level details about the production-facing model setup.", "⚙️")
    c1, c2, c3 = st.columns(3)
    with c1:
        kpi_card("Primary Model", "Random Forest", "Current exported classifier artifact", "🌲")
    with c2:
        kpi_card("Learning Style", "ML", "Tree-based supervised classification", "🧮")
    with c3:
        kpi_card("Features Used", "2", "min_price and max_price", "🧾")

    section_header("Technical Details", "Expandable sections for training context and inference behavior.", "📚")
    with st.expander("Model type used", expanded=True):
        st.write(
            "The deployed app currently uses a machine learning classifier exported from the notebook workflow. "
            "The saved production artifact is a Random Forest classifier, while the notebook also explored Gradient Boosting, ANN, and DNN variants."
        )

    with st.expander("Training process explanation", expanded=False):
        st.write(
            "The notebook loads the crop prices dataset, cleans missing values, identifies numeric and categorical columns, "
            "scales the numerical inputs, and evaluates multiple models on a train-test split. The production package keeps "
            "the streamlined inference path around the exported scaler and classifier."
        )

    with st.expander("Input features", expanded=False):
        st.markdown(
            """
            - `min_price`: lower market price boundary
            - `max_price`: upper market price boundary

            The wider dashboard also captures crop and region context for the user experience, but the saved classifier itself consumes the two numeric price features above.
            """
        )

    with st.expander("Output prediction explanation", expanded=False):
        st.markdown(
            """
            - `prediction = 1` maps to `SELL`
            - `prediction = 0` maps to `HOLD`
            - Confidence is derived from model probabilities when available

            The dashboard also estimates a likely modal price from filtered historical records so the user sees a price-oriented output alongside the action recommendation.
            """
        )

    section_header("Evaluation Metrics", "Notebook-reported benchmark results from the project artifacts.", "📏")
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        kpi_card("Random Forest", "99.71%", "Notebook accuracy", "🌲")
    with m2:
        kpi_card("Gradient Boosting", "99.71%", "Notebook accuracy", "🚀")
    with m3:
        kpi_card("ANN", "99.65%", "Notebook test accuracy", "🧠")
    with m4:
        kpi_card("DNN", "70.40%", "Notebook test accuracy", "🔬")

    section_header("Live Backend Registry", "Model metadata reported by the FastAPI service, when available.", "🗃️")
    if health and health.get("models"):
        for model in health["models"]:
            info_card(
                model["model"],
                f"Version {model['version']} is loaded in the backend registry. Loaded_at timestamp: {model['loaded_at']:.0f}.",
                "✅",
            )
    else:
        info_card(
            "Backend Metadata Unavailable",
            "The page still shows notebook and artifact details, but live backend registry information is not reachable right now.",
            "⚠️",
        )
