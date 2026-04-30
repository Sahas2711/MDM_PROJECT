# AgriIntel AI Dashboard

AgriIntel AI Dashboard is a modern, dark-theme React application for crop recommendation, sell-timing intelligence, market clustering analysis, and model performance visibility.

The UI is designed as an AI decision system, not a generic admin panel.

## Core Highlights

- React + Vite architecture with fast local development.
- Tailwind-based design tokens and dark AI visual language.
- Framer Motion animations for route transitions and micro-interactions.
- Recharts-driven visual analytics for trends, clusters, and performance.
- Modular page architecture with reusable UX components (loading overlays, explainability panels, cards).

## Tech Stack

- React 19
- Vite
- React Router DOM
- Tailwind CSS 3
- Framer Motion
- Recharts
- clsx + tailwind-merge

## Project Structure

```text
frontend/
	src/
		components/
			layout/        # Sidebar, top navbar, shell layout
			ui/            # Reusable UI primitives (Card)
			ux/            # UX primitives (AI loading overlay, explainability panel)
		hooks/           # Shared hooks (useAiLoading)
		lib/             # Utility helpers (cn)
		pages/           # Route pages (Dashboard, CropRecommendation, etc.)
		App.jsx          # Route definitions
		App.css          # Global shell and interaction styles
		index.css        # Tailwind layers + global base styles
```

## Routes

- / -> Dashboard
- /crop-recommendation -> Crop Recommendation
- /sell-timing -> Sell Timing
- /market-intelligence -> Market Intelligence
- /model-performance -> Model Performance

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build production bundle:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Available Scripts

- npm run dev: start Vite dev server
- npm run build: create optimized production build
- npm run preview: preview the production build locally
- npm run lint: run ESLint checks

## Documentation Index

- ARCHITECTURE.md
- DESIGN_SYSTEM.md
- ROUTES_AND_PAGES.md
- SETUP_AND_SCRIPTS.md
- CONTRIBUTING.md
- TROUBLESHOOTING.md

## Design Principles

- Explainability first: model-driven outputs must include clear reasoning.
- Decision support over decoration: every chart should drive action.
- Consistent interaction language: smooth transitions, clear loading states, and responsive feedback.
- Production-grade readability: spacing, hierarchy, and contrast optimized for dense dashboards.

## Current Notes

- Build may show chunk size warnings due to charting and animation libraries. This does not block deployment but should be optimized with route-level code splitting later.

## License

This project currently has no license file configured.
