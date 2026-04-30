import streamlit as st

from components.cards import hero_header, info_card, kpi_card, section_header, stat_strip
from services.api import get_health
from utils.sample_data import get_dashboard_metrics


def _go_to(page_name: str) -> None:
    st.session_state.selected_page = page_name


def render() -> None:
    health = get_health()
    metrics = get_dashboard_metrics()
    api_status = "Online" if health else "Offline"

    hero_header(
        "Crop Price Prediction System",
        "A professional decision-support dashboard for monitoring crop markets, running price predictions, and turning market data into clear selling guidance.",
        "🌾 Smart Agriculture Intelligence",
    )
    stat_strip(
        [
            ("Platform", "Production-style UI"),
            ("Backend", api_status),
            ("Primary Output", "SELL / HOLD"),
        ]
    )

    top_left, top_right = st.columns((1.4, 1))
    with top_left:
        info_card(
            "Project Overview",
            "This system helps users evaluate crop price opportunities through live prediction, exploratory data analysis, model transparency, and insight-driven interpretation in one streamlined workspace.",
            "🏡",
        )
    with top_right:
        if health:
            info_card(
                "System Health",
                f"Backend is healthy with version {health.get('app_version', 'n/a')} and {len(health.get('models', []))} active models ready for prediction.",
                "✅",
            )
        else:
            info_card(
                "System Health",
                "Backend is currently unreachable, but the dashboard still supports analysis and UI exploration with local sample data.",
                "⚠️",
            )

    section_header("Summary Statistics", "A high-level snapshot of the crop pricing workspace.", "📌")
    stat_col1, stat_col2, stat_col3, stat_col4 = st.columns(4)
    with stat_col1:
        kpi_card("Tracked Crops", str(metrics["crop_count"]), "Distinct crops represented in the dashboard", "🧺")
    with stat_col2:
        kpi_card("Datasets", str(metrics["dataset_count"]), "Representative records available for analysis", "🗂️")
    with stat_col3:
        kpi_card("Markets", str(metrics["market_count"]), "Regional market coverage in the sample", "📍")
    with stat_col4:
        kpi_card("Avg Market Price", f"₹{metrics['avg_price']:,.0f}", "Average midpoint across price ranges", "💰")

    section_header("Key Features", "Core capabilities available from the dashboard.", "✨")
    feature_col1, feature_col2, feature_col3 = st.columns(3)
    with feature_col1:
        info_card(
            "Price Prediction",
            "Generate live SELL or HOLD recommendations from minimum and maximum crop prices using the connected backend model.",
            "🌾",
        )
    with feature_col2:
        info_card(
            "Data Analysis",
            "Inspect market behavior, compare pricing trends, and review recommendation distribution through charts and tabular views.",
            "📊",
        )
    with feature_col3:
        info_card(
            "Actionable Insights",
            "Translate raw output into practical guidance with summary observations, spread patterns, and operational suggestions.",
            "💡",
        )

    section_header("Quick Navigation", "Jump directly to the section you want to work in next.", "🧭")
    nav_col1, nav_col2, nav_col3 = st.columns(3)
    with nav_col1:
        st.button("📊 Open Data Analysis", use_container_width=True, on_click=_go_to, args=("Data Analysis",))
    with nav_col2:
        st.button("🌾 Open Prediction", use_container_width=True, type="primary", on_click=_go_to, args=("Prediction",))
    with nav_col3:
        st.button("💡 Open Insights", use_container_width=True, on_click=_go_to, args=("Insights",))

    st.markdown("---")
    section_header("Why This Dashboard Matters", "The landing page highlights the workflow from overview to action.", "🌿")
    highlight_left, highlight_right = st.columns((1, 1))
    with highlight_left:
        info_card(
            "Decision Support",
            "The Home page is designed to orient users quickly with project context, health status, feature discovery, and essential summary metrics.",
            "🛠️",
        )
    with highlight_right:
        info_card(
            "Professional Experience",
            "Cards, columns, highlight sections, and direct navigation create a polished dashboard feel rather than a basic prototype interface.",
            "🎯",
        )
