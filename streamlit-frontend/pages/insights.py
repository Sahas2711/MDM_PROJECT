import streamlit as st

from components.cards import hero_header, info_card, kpi_card, section_header, stat_strip
from utils.data_loader import load_crop_dataset


def render() -> None:
    with st.spinner("Preparing insight views..."):
        df = load_crop_dataset()

    hero_header(
        "Insights Dashboard",
        "Analyze crop price trends, seasonal movement, and market comparisons through a cleaner analytical workspace with interactive filters.",
        "💡 Analytical Insights Engine",
    )
    stat_strip(
        [
            ("Rows", f"{len(df):,}"),
            ("States", str(df["state"].nunique())),
            ("Crops", str(df["commodity"].nunique())),
        ]
    )

    filter_col1, filter_col2, filter_col3 = st.columns(3)
    with filter_col1:
        selected_crop = st.selectbox("Crop Filter", ["All"] + sorted(df["commodity"].dropna().unique().tolist()))
    with filter_col2:
        selected_state = st.selectbox("State Filter", ["All"] + sorted(df["state"].dropna().unique().tolist()))
    with filter_col3:
        selected_metric = st.selectbox("Comparison Metric", ["modal_price", "min_price", "max_price", "price_spread"])

    filtered = df.copy()
    if selected_crop != "All":
        filtered = filtered[filtered["commodity"] == selected_crop]
    if selected_state != "All":
        filtered = filtered[filtered["state"] == selected_state]

    if filtered.empty:
        st.error("No records match the selected crop and state filters.")
        return

    section_header("Trend Analysis", "Track how crop prices move over time for the selected context.", "📈")
    trend_col1, trend_col2 = st.columns((1.4, 1))
    with trend_col1:
        st.subheader("Price trend by arrival date")
        trend_df = (
            filtered.dropna(subset=["arrival_date"])
            .groupby("arrival_date")[["min_price", "modal_price", "max_price"]]
            .mean()
            .sort_index()
        )
        st.line_chart(trend_df)
    with trend_col2:
        kpi_card("Avg Modal Price", f"₹{filtered['modal_price'].mean():,.0f}", "Current filtered average", "💰")
        kpi_card("Avg Spread", f"₹{filtered['price_spread'].mean():,.0f}", "Average market spread", "📏")
        dominant_month = filtered["arrival_month"].mode().iloc[0] if not filtered["arrival_month"].mode().empty else "N/A"
        kpi_card("Dominant Month", dominant_month, "Most frequent seasonal month", "🗓️")

    section_header("Seasonal Patterns", "Reveal monthly pricing behavior across the filtered crop-market slice.", "🌦️")
    seasonal_col1, seasonal_col2 = st.columns(2)
    with seasonal_col1:
        st.subheader("Monthly average prices")
        seasonal_df = (
            filtered.dropna(subset=["arrival_month"])
            .groupby("arrival_month")[["min_price", "modal_price", "max_price"]]
            .mean()
            .reindex(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])
            .dropna(how="all")
        )
        st.bar_chart(seasonal_df)
    with seasonal_col2:
        st.subheader("Seasonal spread distribution")
        spread_bins = filtered["price_spread"].value_counts(bins=16, sort=False).rename_axis("bucket").reset_index(name="count")
        st.bar_chart(spread_bins.set_index("bucket"))

    section_header("Comparison Charts", "Compare crop or state performance with the metric you care about most.", "📊")
    compare_col1, compare_col2 = st.columns(2)
    with compare_col1:
        st.subheader("Top crops by selected metric")
        compare_crop = (
            filtered.groupby("commodity", as_index=False)[selected_metric]
            .mean()
            .sort_values(selected_metric, ascending=False)
            .head(12)
            .set_index("commodity")
        )
        st.bar_chart(compare_crop)
    with compare_col2:
        st.subheader("State comparison")
        compare_state = (
            filtered.groupby("state", as_index=False)[selected_metric]
            .mean()
            .sort_values(selected_metric, ascending=False)
            .head(12)
            .set_index("state")
        )
        st.bar_chart(compare_state)

    st.markdown("---")
    section_header("Analytical Takeaways", "Summaries that help interpret the filtered charts quickly.", "🧭")
    insight_col1, insight_col2, insight_col3 = st.columns(3)
    with insight_col1:
        info_card(
            "Trend View",
            "Use the line chart to spot price acceleration or flattening across the selected arrival dates.",
            "📉",
        )
    with insight_col2:
        info_card(
            "Seasonality",
            "Monthly grouping makes it easier to detect recurring seasonal peaks and low-price windows.",
            "🍃",
        )
    with insight_col3:
        info_card(
            "Comparison Strength",
            "Switch the metric dropdown to compare spread, minimum, maximum, or modal pricing across crops and states.",
            "🔍",
        )
