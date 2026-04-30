# Architecture Guide

## Overview

AgriIntel AI Dashboard uses a route-centric React architecture with a shared layout shell and modular page components.

The app focuses on predictable composition:

- Layout components define navigation and shell behavior.
- Page components own feature-specific data and visual logic.
- Reusable UX and UI primitives enforce consistency.

## High-Level Layers

1. App Router Layer
- File: src/App.jsx
- Responsibility: Route mapping and default fallback redirect.

2. Layout Layer
- Files: src/components/layout/Layout.jsx, Sidebar.jsx, Navbar.jsx
- Responsibility: Persistent shell (sidebar + top navbar), route transition animation, responsive behavior.

3. Feature Page Layer
- Files: src/pages/*.jsx
- Responsibility: Domain UI and chart rendering for each use case:
  - Dashboard
  - Crop Recommendation
  - Sell Timing
  - Market Intelligence
  - Model Performance

4. Reusable UI/UX Layer
- UI primitives: src/components/ui/card.jsx
- UX primitives: src/components/ux/AIAnalyzingOverlay.jsx, ExplainabilityPanel.jsx
- Shared behavior hooks: src/hooks/useAiLoading.js
- Utilities: src/lib/utils.js

## Data Flow Pattern

Current version uses static or simulated data directly inside page components.

Recommended integration pattern for backend APIs:

1. Move API calls into a services layer.
2. Convert static datasets into async query results.
3. Keep presentational components pure and data-agnostic.
4. Retain explainability blocks with real model metadata.

## State Management

Current local state strategy:

- useState for page-level inputs and simple interactions.
- useMemo for derived values.
- custom hook useAiLoading for lightweight loading experience.

When complexity increases, adopt a query/cache layer and keep route pages thin.

## Routing Strategy

- Nested routing under a common Layout.
- Route transitions animated in Layout.jsx using location-keyed motion.
- Unknown routes redirect to root path.

## Styling Strategy

- Tailwind tokens declared in tailwind.config.js
- App shell and advanced interaction classes in App.css
- Base layers and Tailwind directives in index.css
- Utility class merging with cn helper from src/lib/utils.js

## Component Design Rules

- Keep components small and single-purpose.
- Reuse Card primitive for all analytical blocks.
- Use ExplainabilityPanel for model transparency across pages.
- Avoid plain tables for core decisions unless strictly required.

## Scalability Roadmap

1. Add src/services for API integration.
2. Add src/types for shared data contracts.
3. Add src/components/charts for reusable chart wrappers.
4. Add route-level lazy loading to reduce bundle size.
5. Add unit and integration testing layers.
