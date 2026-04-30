# UI Summary — AgriIntel AI Dashboard

> Stack: React 19 · Vite · Tailwind CSS · Framer Motion · Recharts · React Router v7

---

## Navigation & Routing

| Route | Page | API Connected |
|-------|------|---------------|
| `/` | Dashboard | `POST /predict-image` |
| `/crop-recommendation` | Crop Recommendation | None (mock) |
| `/sell-timing` | Sell Timing | `POST /predict` |
| `/market-intelligence` | Market Intelligence | None (static) |
| `/model-performance` | Model Performance | None (static) |
| `/smart-decision` | Smart Decision | `POST /smart-decision` |

Unknown routes redirect to `/`.

---

## API Service — `src/services/api.js`

Base URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:8000'`

| Function | Method | Endpoint | Payload |
|----------|--------|----------|---------|
| `fetchPrediction(min, max)` | POST | `/predict` | JSON body `{min_price, max_price}` |
| `fetchPredictImage(file)` | POST | `/predict-image` | `FormData` with `file` |
| `fetchSmartDecision(file, min, max)` | POST | `/smart-decision` | `FormData` + query params `min_price`, `max_price` |

---

## Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Card / CardHeader / CardTitle / CardDescription / CardContent` | `components/ui/card.jsx` | Base card container used on every page |
| `AIAnalyzingOverlay` | `components/ux/AIAnalyzingOverlay.jsx` | Full-page spinner overlay on page load / API call |
| `ExplainabilityPanel` | `components/ux/ExplainabilityPanel.jsx` | 3-bullet explainability card at bottom of each page |
| `useAiLoading(ms)` | `hooks/useAiLoading.js` | Returns `true` for `ms` milliseconds on mount — drives overlay |
| `cn()` | `lib/utils.js` | `clsx` + `tailwind-merge` class helper |
| `Layout` | `components/layout/Layout.jsx` | Sidebar nav + `<Outlet />` wrapper for all routes |

---

## Page-by-Page Breakdown

---

### 1. Dashboard `/`

**API:** `POST /predict-image`

**Sections:**

| Section | Type | Data | Interactive |
|---------|------|------|-------------|
| AI Summary Card | Info card | Hardcoded — "Recommended Crop: Wheat", 92% confidence | No |
| Market Action | Info card | Hardcoded — SELL badge, 10:00 AM–1:30 PM window | No |
| Crop Quality Scanner | Feature card | Live — calls `/predict-image` | Yes |
| Price Trend Graph | Line chart | Hardcoded weekly data (Mon–Sat) | Hover tooltip |
| 4 Cluster Intelligence Map | Horizontal bar chart | Hardcoded cluster scores | Hover tooltip |
| System Snapshot | Stat tiles | Hardcoded — Accuracy, Dataset Size, Best Model | No |
| Explainability Panel | 3-bullet card | Hardcoded | No |

**Crop Quality Scanner — Controls:**
- File upload button (accepts JPEG, PNG, WEBP, BMP) — hidden `<input type="file">` triggered by styled div
- `Scan Crop` button — disabled until file selected; disabled during scan
- Error banner — shown for invalid file type or API failure

**Crop Quality Scanner — Result (after API response):**
- Left panel: image with black background, "AI Crop Analysis" header bar, bottom overlay showing Freshness / Confidence / Decision in green/blue monospace text
- Right panel: "Final System Output" terminal-style key-value block (Freshness, Confidence, Agent Decision, Latency, Model Version) + animated confidence progress bar

**Charts:**
- Price Trend: `ComposedChart` with 3 `Line` series — `min_price` (orange), `modal_price` (cyan), `max_price` (green)
- Cluster Map: `BarChart` horizontal layout, 4 colored `Cell` bars

---

### 2. Crop Recommendation `/crop-recommendation`

**API:** None — fully mock

**Controls:**
- State dropdown — 5 options (Punjab, Haryana, Maharashtra, Karnataka, Uttar Pradesh)
- Market dropdown — updates based on selected state (3 markets per state)
- Optional Crop dropdown — 5 options + "Auto-select by AI"
- `Analyze Recommendation` button — triggers 1.4s simulated delay then shows result

**Result card (after submit):**
- Recommended Crop tile
- Predicted Profitability badge — High (green) / Medium (amber) / Low (red)
- Expected Price Range tile
- Confidence % tile (monospace cyan)
- "Why this recommendation" full-width explanation tile
- ExplainabilityPanel (dynamic bullets using selected market + crop)

---

### 3. Sell Timing `/sell-timing`

**API:** `POST /predict`

**Static sections:**
- Intraday Price Trend: `LineChart` with 12 hourly data points (06:00–17:00), green `ReferenceArea` for best window (10:00–13:00), red for worst (06:00–08:00)
- Action Indicator card: static SELL badge, 91% confidence, best/worst window tiles
- Explanation card: static text + best/worst window info tiles

**Live Prediction card — Controls:**
- Min Price input (number, INR)
- Max Price input (number, INR)
- `Run Prediction` button — client-side validates both fields before calling API

**Live Prediction card — Result (after API response):**

| Tile | Content |
|------|---------|
| Recommendation | SELL (green) or HOLD (amber) — large text |
| Model Output | Raw `0` or `1` value |
| Confidence | `predict_proba` score as % |
| Market Insight | Green highlighted card — actionable sentence |
| Price Range Analysis | Muted card — spread characterization |
| Footer row | Model name + version (left) · Latency ms (right) |

---

### 4. Market Intelligence `/market-intelligence`

**API:** None — fully static

**Sections:**

| Section | Type | Details |
|---------|------|---------|
| Scatter Chart | `ScatterChart` | 4 cluster series (20 points total), X = Demand Index, Y = Modal Price, custom tooltip |
| Cluster Legend | 4 tiles | Color dot + label + centroid for each cluster |
| Cluster Interpretation | 4 colored tiles + 1 ML Depth tile | Per-cluster insight text |
| Explainability Panel | 3-bullet card | Static |

**Clusters:** Low Price (orange) · Stable (blue) · High Demand (green) · Volatile (amber)

---

### 5. Model Performance `/model-performance`

**API:** None — fully static

**Sections:**

| Section | Type | Details |
|---------|------|---------|
| Accuracy Benchmark | `BarChart` | 5 models, best model bar highlighted green, others blue |
| Best Model card | Info card | Model name + accuracy % + description |
| Performance Interpretation | 3 tiles | Insight text per model group |
| Explainability Panel | 3-bullet card | Static |

**Models shown:** Random Forest (96.8%) · Gradient Boosting (97.5%) · ANN (98.2%) · DNN (99.1%) · SVM (95.9%)

---

### 6. Smart Decision `/smart-decision`

**API:** `POST /smart-decision`

**Input card — Controls:**
- Crop Image file upload (JPEG/PNG/WEBP/BMP) — styled div trigger + hidden input
- Inline thumbnail preview (h-11 w-11) shown next to submit button after file selected
- Min Price input (number, INR)
- Max Price input (number, INR)
- `Run Smart Decision` button — validates all 3 inputs before calling API
- Error banner — shown for validation failures or API errors

**Result card (after API response):**

| Element | Content |
|---------|---------|
| Uploaded Image tile | `h-28` image preview |
| Freshness badge | Green (Fresh) or Red (Rotten) with large text |
| Confidence tile | CNN certainty % in cyan monospace |
| Recommendation badge | SELL (green) / HOLD (amber) / DO NOT SELL (red) + model name |
| Market Insight card | Green highlight — actionable market sentence |
| Final Decision Reason card | Cyan highlight — combined freshness + market explanation |
| ExplainabilityPanel | Dynamic bullets — changes based on Fresh vs Rotten result |

---

## Badges & Visual Tokens

| Badge | Color | Used On |
|-------|-------|---------|
| SELL | Green border/bg | Dashboard, SellTiming, SmartDecision |
| HOLD | Amber border/bg | SellTiming, SmartDecision |
| DO NOT SELL | Red border/bg | SmartDecision |
| High profitability | Green | CropRecommendation |
| Medium profitability | Amber | CropRecommendation |
| Low profitability | Red | CropRecommendation |
| Fresh | Green (`agri-leaf`) | Dashboard, SmartDecision |
| Rotten | Red (`badge-loss`) | Dashboard, SmartDecision |

---

## Loading & Error States

Every interactive page follows the same pattern:

| State | UI |
|-------|----|
| Page mount | `AIAnalyzingOverlay` full-page spinner for ~850ms |
| API in-flight | Inline spinner (rotating cyan ring) inside result area |
| API error | Red bordered banner with `error.detail` message |
| Idle (no result yet) | Dashed border placeholder with instruction text |
| Result | Animated `motion.div` fade-in from y+6 |

---

## Environment

| Variable | File | Default |
|----------|------|---------|
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8000` |
