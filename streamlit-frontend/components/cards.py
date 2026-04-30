import streamlit as st


def hero_header(title: str, subtitle: str, badge: str) -> None:
    st.markdown(
        f"""
        <div class="hero-panel">
            <div class="hero-copy">
                <div class="hero-badge">{badge}</div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            <div class="hero-orb"></div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def section_header(title: str, caption: str, icon: str = "🌿") -> None:
    st.markdown(
        f"""
        <div class="section-heading">
            <span>{icon}</span>
            <div>
                <h3>{title}</h3>
                <p>{caption}</p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("<div class='section-divider'></div>", unsafe_allow_html=True)


def kpi_card(title: str, value: str, help_text: str, icon: str = "📈") -> None:
    st.markdown(
        f"""
        <div class="dashboard-card metric-card">
            <div class="metric-top">
                <span class="metric-icon">{icon}</span>
                <span class="metric-title">{title}</span>
            </div>
            <div class="metric-value">{value}</div>
            <div class="metric-help">{help_text}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def info_card(title: str, body: str, icon: str = "🌱") -> None:
    st.markdown(
        f"""
        <div class="dashboard-card info-card">
            <div class="info-title">{icon} {title}</div>
            <div class="info-body">{body}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def stat_strip(items: list[tuple[str, str]]) -> None:
    segments = "".join(
        f"""
        <div class="stat-pill">
            <span class="stat-label">{label}</span>
            <strong>{value}</strong>
        </div>
        """
        for label, value in items
    )
    st.markdown(f"<div class='stat-strip'>{segments}</div>", unsafe_allow_html=True)
