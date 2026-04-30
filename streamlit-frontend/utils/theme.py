import streamlit as st


def configure_page() -> None:
    st.set_page_config(
        page_title="Crop Price Prediction System",
        page_icon="🌱",
        layout="wide",
        initial_sidebar_state="expanded",
    )


def apply_theme() -> None:
    st.markdown(
        """
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

            :root {
                --brand-green: #2f855a;
                --brand-green-dark: #1e5a3d;
                --brand-green-soft: #d8efe2;
                --brand-leaf: #89b87a;
                --brand-gold: #cfb66c;
                --brand-card: rgba(255, 252, 246, 0.86);
                --brand-border: rgba(47, 133, 90, 0.16);
                --text-dark: #1d2d24;
                --text-soft: #567061;
            }

            .stApp {
                font-family: 'Manrope', sans-serif;
                background:
                    radial-gradient(circle at top right, rgba(137, 184, 122, 0.24), transparent 26%),
                    radial-gradient(circle at left 20%, rgba(207, 182, 108, 0.14), transparent 24%),
                    linear-gradient(180deg, #f8f5ee 0%, #f1ebdc 100%);
                color: var(--text-dark);
            }

            section[data-testid="stSidebar"] {
                background: linear-gradient(180deg, #163b2a 0%, #245f41 46%, #2f855a 100%);
                border-right: 1px solid rgba(255, 255, 255, 0.08);
            }

            section[data-testid="stSidebar"] * {
                color: #ffffff;
            }

            section[data-testid="stSidebar"] .stRadio > div {
                gap: 0.35rem;
            }

            .stButton > button,
            .stDownloadButton > button {
                background: linear-gradient(135deg, var(--brand-green) 0%, #5c9a57 100%);
                color: white;
                border: none;
                border-radius: 14px;
                padding: 0.7rem 1rem;
                font-weight: 700;
                box-shadow: 0 14px 28px rgba(47, 133, 90, 0.22);
            }

            .stButton > button:hover,
            .stDownloadButton > button:hover {
                background: linear-gradient(135deg, var(--brand-green-dark) 0%, #467c47 100%);
                color: white;
            }

            .stSelectbox label,
            .stNumberInput label,
            .stTextInput label,
            .stFileUploader label {
                font-weight: 700;
                color: var(--text-dark);
            }

            div[data-baseweb="select"] > div,
            .stNumberInput > div > div > input {
                border-radius: 14px;
                border: 1px solid rgba(47, 133, 90, 0.18);
                background: rgba(255, 255, 255, 0.92);
            }

            .block-container {
                padding-top: 1.1rem;
                padding-bottom: 2.2rem;
                max-width: 1320px;
            }

            .dashboard-card {
                background: var(--brand-card);
                backdrop-filter: blur(12px);
                border: 1px solid var(--brand-border);
                border-radius: 22px;
                padding: 1rem 1.1rem;
                box-shadow: 0 20px 45px rgba(46, 74, 52, 0.08);
                min-height: 100%;
            }

            .metric-top {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                margin-bottom: 0.75rem;
            }

            .metric-icon {
                width: 2.2rem;
                height: 2.2rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 14px;
                background: linear-gradient(135deg, rgba(47, 133, 90, 0.18), rgba(137, 184, 122, 0.28));
                font-size: 1.1rem;
            }

            .metric-title,
            .stat-label {
                color: var(--text-soft);
                font-size: 0.92rem;
                font-weight: 700;
            }

            .metric-value {
                font-size: 2rem;
                line-height: 1.1;
                font-weight: 800;
                color: var(--brand-green-dark);
            }

            .metric-help,
            .info-body,
            .section-heading p,
            .hero-copy p {
                color: var(--text-soft);
                font-size: 0.95rem;
                line-height: 1.6;
            }

            .info-title {
                font-size: 1.05rem;
                font-weight: 800;
                color: var(--text-dark);
                margin-bottom: 0.55rem;
            }

            .hero-panel {
                position: relative;
                overflow: hidden;
                display: flex;
                justify-content: space-between;
                gap: 1.2rem;
                background: linear-gradient(135deg, #163b2a 0%, #245f41 55%, #5b9156 100%);
                border-radius: 28px;
                padding: 1.6rem;
                color: white;
                box-shadow: 0 24px 55px rgba(28, 70, 49, 0.28);
                margin-bottom: 1.25rem;
            }

            .hero-panel::before {
                content: "";
                position: absolute;
                inset: auto -40px -60px auto;
                width: 220px;
                height: 220px;
                border-radius: 999px;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 70%);
            }

            .hero-copy {
                position: relative;
                z-index: 1;
                max-width: 760px;
            }

            .hero-copy h1 {
                color: white;
                margin: 0.45rem 0;
                font-size: 2.1rem;
                line-height: 1.1;
                font-weight: 800;
            }

            .hero-copy p {
                color: rgba(255, 255, 255, 0.88);
                margin: 0;
                max-width: 680px;
            }

            .hero-badge {
                display: inline-flex;
                align-items: center;
                padding: 0.35rem 0.7rem;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.14);
                border: 1px solid rgba(255, 255, 255, 0.16);
                font-size: 0.82rem;
                font-weight: 700;
            }

            .hero-orb {
                width: 150px;
                min-width: 150px;
                height: 150px;
                border-radius: 28px;
                background:
                    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
                    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.46), transparent 28%);
                border: 1px solid rgba(255, 255, 255, 0.18);
            }

            .section-heading {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                margin-top: 1rem;
            }

            .section-heading span {
                font-size: 1.3rem;
                line-height: 1.2;
            }

            .section-heading h3 {
                margin: 0;
                color: var(--brand-green-dark);
                font-weight: 800;
            }

            .section-heading p {
                margin: 0.2rem 0 0;
            }

            .section-divider {
                height: 1px;
                margin: 0.75rem 0 1rem;
                background: linear-gradient(90deg, rgba(47, 133, 90, 0.35), rgba(47, 133, 90, 0.02));
            }

            .stat-strip {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
                margin: 0.25rem 0 1rem;
            }

            .stat-pill {
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(47, 133, 90, 0.14);
                border-radius: 999px;
                padding: 0.55rem 0.9rem;
            }

            .stat-pill strong {
                margin-left: 0.45rem;
                color: var(--brand-green-dark);
            }

            div[data-testid="stDataFrame"],
            div[data-testid="stAlert"],
            div[data-testid="stMetric"],
            div[data-testid="stSpinner"] {
                background: var(--brand-card);
                border: 1px solid var(--brand-border);
                border-radius: 20px;
                box-shadow: 0 18px 38px rgba(46, 74, 52, 0.06);
                overflow: hidden;
            }

            .footer-panel {
                margin-top: 1.5rem;
                padding: 1rem 1.2rem;
                border-radius: 20px;
                background: rgba(22, 59, 42, 0.94);
                color: rgba(255, 255, 255, 0.88);
                display: flex;
                justify-content: space-between;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .footer-panel strong {
                color: white;
            }

            @media (max-width: 900px) {
                .hero-panel {
                    padding: 1.3rem;
                }

                .hero-orb {
                    display: none;
                }
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_footer() -> None:
    st.markdown(
        """
        <div class="footer-panel">
            <div><strong>Crop Price Prediction System</strong><br/>Streamlit decision-support dashboard for crop market analysis and fast recommendation workflows.</div>
            <div><strong>Stack</strong><br/>Streamlit, scikit-learn artifacts, cached dataset + model loading</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
