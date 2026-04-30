# Streamlit Frontend

Multi-page Streamlit application for the Crop Price Prediction System.

## Pages

- Home
- Data Analysis
- Model Info
- Prediction
- Insights

## Run

```bash
streamlit run app.py
```

## Backend

The Prediction page uses the FastAPI backend at `http://127.0.0.1:8000` by default.

To change it:

```bash
$env:STREAMLIT_API_BASE_URL="http://127.0.0.1:8000"
streamlit run app.py
```
