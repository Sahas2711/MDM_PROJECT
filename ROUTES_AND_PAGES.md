# Routes and Pages

## Route Map

- / -> Dashboard
- /crop-recommendation -> Crop Recommendation
- /sell-timing -> Sell Timing
- /market-intelligence -> Market Intelligence
- /model-performance -> Model Performance

Routing source:

- src/App.jsx

## Page Responsibilities

### Dashboard

File: src/pages/Dashboard.jsx

Purpose:

- AI summary snapshot
- trend visualization
- cluster view summary
- quick system metrics
- explainability entry point

### Crop Recommendation

File: src/pages/CropRecommendation.jsx

Purpose:

- collect user inputs (state, market, optional crop)
- provide predicted profitability output
- show expected price range and confidence
- include AI loading and recommendation reasoning

### Sell Timing

File: src/pages/SellTiming.jsx

Purpose:

- visualize intraday price trend
- mark best and worst sell windows
- provide SELL or HOLD signal with confidence
- explain timing rationale

### Market Intelligence

File: src/pages/MarketIntelligence.jsx

Purpose:

- scatter clustering view across market segments
- legend for cluster interpretation
- insights panel for cluster-level strategy

### Model Performance

File: src/pages/ModelPerformance.jsx

Purpose:

- compare model accuracy
- highlight best model
- summarize selection and fallback insights

## Shared Layout

Files:

- src/components/layout/Layout.jsx
- src/components/layout/Sidebar.jsx
- src/components/layout/Navbar.jsx

Behavior:

- collapsible sidebar
- active route highlighting
- animated route transitions

## Shared UX Components

- src/components/ux/AIAnalyzingOverlay.jsx
- src/components/ux/ExplainabilityPanel.jsx
- src/hooks/useAiLoading.js
