import streamlit as st

from components.cards import hero_header, info_card, kpi_card, section_header, stat_strip
from utils.data_loader import load_crop_dataset


def render() -> None:
    with st.spinner("Loading crop dataset..."):
        df = load_crop_dataset()

    hero_header(
        "Data Analysis Dashboard",
        "Load the crop market dataset, slice it interactively by crop and region, and explore pricing behavior through summary statistics and visual trends.",
        "📊 Dataset Explorer",
    )
    stat_strip(
        [
            ("Rows Loaded", f"{len(df):,}"),
            ("Crops", str(df["commodity"].nunique())),
            ("States", str(df["state"].nunique())),
        ]
    )

    filter_col1, filter_col2, filter_col3 = st.columns(3)
    with filter_col1:
        selected_crop = st.selectbox("Crop", ["All"] + sorted(df["commodity"].dropna().unique().tolist()))
    with filter_col2:
        selected_state = st.selectbox("Region / State", ["All"] + sorted(df["state"].dropna().unique().tolist()))
    with filter_col3:
        selected_market = st.selectbox("Market", ["All"] + sorted(df["market"].dropna().unique().tolist()))

    filtered = df.copy()
    if selected_crop != "All":
        filtered = filtered[filtered["commodity"] == selected_crop]
    if selected_state != "All":
        filtered = filtered[filtered["state"] == selected_state]
    if selected_market != "All":
        filtered = filtered[filtered["market"] == selected_market]

    if filtered.empty:
        st.error("No dataset rows match the selected crop, state, and market filters.")
        return

    section_header("Dataset Preview", "Loaded records with crop, geography, and price fields.", "🗂️")
    with st.container():
        st.dataframe(filtered.head(50), use_container_width=True, hide_index=True)
        st.success(f"Showing {min(len(filtered), 50):,} preview rows from {len(filtered):,} filtered records.")

    stats = filtered[["min_price", "max_price", "modal_price", "price_spread"]].describe().T
    stats["median"] = filtered[["min_price", "max_price", "modal_price", "price_spread"]].median()
    stats = stats[["mean", "median", "std", "min", "max"]].round(2)

    section_header("Summary Statistics", "Mean, median, and spread statistics for the active filter set.", "📌")
    metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
    with metric_col1:
        kpi_card("Mean Modal Price", f"₹{filtered['modal_price'].mean():,.0f}", "Average typical price", "💰")
    with metric_col2:
        kpi_card("Median Modal Price", f"₹{filtered['modal_price'].median():,.0f}", "Central tendency", "📍")
    with metric_col3:
        kpi_card("Mean Spread", f"₹{filtered['price_spread'].mean():,.0f}", "Average max-min spread", "📏")
    with metric_col4:
        kpi_card("Records", f"{len(filtered):,}", "Rows after filtering", "🧾")

    with st.expander("View detailed statistics table", expanded=False):
        st.dataframe(stats, use_container_width=True)

    section_header("Visualizations", "Interactive views for distribution, comparison, and time trends.", "📈")
    chart_col1, chart_col2 = st.columns(2)
    with chart_col1:
        st.subheader("Bar Chart: Average modal price by crop")
        crop_bar = (
            filtered.groupby("commodity", as_index=False)["modal_price"]
            .mean()
            .sort_values("modal_price", ascending=False)
            .head(12)
            .set_index("commodity")
        )
        st.bar_chart(crop_bar)

    with chart_col2:
        st.subheader("Histogram: Modal price distribution")
        st.bar_chart(
            filtered["modal_price"].value_counts(bins=20, sort=False).rename_axis("bucket").reset_index(name="count").set_index("bucket")
        )

    with st.container():
        st.subheader("Line Chart: Price trend by arrival date")
        time_series = (
            filtered.dropna(subset=["arrival_date"])
            .groupby("arrival_date")[["min_price", "modal_price", "max_price"]]
            .mean()
            .sort_index()
        )
        st.line_chart(time_series)

    st.markdown("---")
    info_card(
        "Interactive Workflow",
        "Use crop, state, and market filters together to narrow the dataset, then compare the preview, summary statistics, and charts for a clean exploration loop.",
        "🌿",
    )
