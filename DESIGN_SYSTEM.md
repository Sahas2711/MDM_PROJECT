# Design System

## Theme Direction

Dark AI + Agriculture + Finance.

The visual language should feel premium, analytical, and action-oriented.

## Design Tokens

Configured in tailwind.config.js.

### Core Colors

- Background canvas: #05080F
- Elevated background: #0B1220
- Card background: #121B2D
- Card hover layer: #16233A
- Soft border: #22314D
- Strong border: #30456B

### Text

- Primary: #EAF2FF
- Secondary: #B4C0D9
- Muted: #7F92B8

### Brand and Domain

- AI blue: #4DA3FF
- Deep AI blue: #2B6FD6
- Neon cyan: #2DE2E6
- Agriculture green: #2FAA65

### Decision Badges

- Sell: #3A1B17 / #FF9A74 / #7A3428
- Hold: #3A2E15 / #FFD78A / #7A5A1F
- Profit: #163523 / #7FF0BA / #1E7F49
- Loss: #3D1720 / #FF9BA7 / #8E2A3D

## Typography

Font families are tokenized in Tailwind:

- sans: Manrope
- display: Sora
- mono: JetBrains Mono

Usage rules:

- display for headings and key labels
- sans for body and UI text
- mono for metrics, confidence, and numeric emphasis

## Elevation and Effects

- card-sm, card-md, card-lg shadows
- glow-cyan for high-emphasis AI signal blocks
- subtle hover lift for interactive cards and tiles

## Interaction Patterns

- Smooth transitions via cubic-bezier curves.
- Hover lift and border accent on interactive cards.
- AI loading overlay for analytical workflows.
- Micro-interactions on navbar controls and active nav states.

## Explainability Pattern

Every model-driven page should include a Why this recommendation section.

Use ExplainabilityPanel to maintain consistent structure and tone.

## Accessibility Notes

- Keep contrast strong in dark theme.
- Maintain clear focus and hover feedback.
- Prefer concise labels and readable density for data-heavy screens.
