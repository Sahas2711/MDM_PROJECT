import streamlit as st

from pages import data_analysis, home, insights, model_info, prediction
from services.api import get_health
from utils.theme import apply_theme, configure_page, render_footer


def main() -> None:
    configure_page()
    apply_theme()

    navigation = {
        "Home": home.render,
        "Data Analysis": data_analysis.render,
        "Model Info": model_info.render,
        "Prediction": prediction.render,
        "Insights": insights.render,
    }

    icons = {
        "Home": "🏠",
        "Data Analysis": "📊",
        "Model Info": "🧠",
        "Prediction": "🌾",
        "Insights": "💡",
    }

    if "selected_page" not in st.session_state:
        st.session_state.selected_page = "Home"

    health = get_health()
    backend_status = "Online" if health else "Offline"

    with st.sidebar:
        st.markdown("## 🌱 Crop Price Predictor")
        st.caption("Production-style dashboard for crop market decisions")
        selected = st.radio(
            "Navigate",
            options=list(navigation.keys()),
            index=list(navigation.keys()).index(st.session_state.selected_page),
            format_func=lambda label: f"{icons[label]}  {label}",
            label_visibility="collapsed",
        )
        st.session_state.selected_page = selected
        st.divider()
        st.markdown("### 🧾 Workspace")
        st.caption("Prediction uses the local FastAPI backend when available.")
        st.markdown("- Green agriculture theme")
        st.markdown("- Modular page layout")
        st.markdown("- Analyst-friendly summaries")
        st.divider()
        st.markdown("### ℹ️ System Info")
        st.write(f"Backend status: `{backend_status}`")
        if health:
            st.write(f"Default model: `{health.get('default_model', 'n/a')}`")
            st.write(f"Loaded models: `{len(health.get('models', []))}`")
        else:
            st.write("Local cached model fallback remains available on the Prediction page.")

    navigation[st.session_state.selected_page]()
    render_footer()


if __name__ == "__main__":
    main()
