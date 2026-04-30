# AgriIntel AI Dashboard Design System

Theme direction: Dark AI + Agriculture + Finance

This system is built for data-dense dashboards, predictive insights, and decision-grade clarity. The visual tone should feel premium, analytical, and alive, not like a generic admin template.

## 1) Color Palette

### Core Surfaces

- bg.canvas: #05080F
- bg.elevated: #0B1220
- bg.card: #121B2D
- bg.cardHover: #16233A
- bg.overlay: #03060ECC
- border.soft: #22314D
- border.strong: #30456B

### AI + Data Primaries

- brand.aiBlue: #4DA3FF
- brand.aiBlueDeep: #2B6FD6
- brand.neonCyan: #2DE2E6
- brand.signalViolet: #6F7CFF

### Agriculture Layer

- agri.leaf: #2FAA65
- agri.forest: #1E7F49
- agri.mint: #69D39A
- agri.soil: #8D6B4F

### Finance Layer

- finance.profit: #1FD47A
- finance.loss: #FF5D6C
- finance.hold: #F7B955
- finance.sell: #FF7A45

### Text

- text.primary: #EAF2FF
- text.secondary: #B4C0D9
- text.muted: #7F92B8
- text.inverse: #08111F

### Chart Tokens

- chart.1: #4DA3FF
- chart.2: #2DE2E6
- chart.3: #2FAA65
- chart.4: #F7B955
- chart.5: #FF7A45
- chart.6: #FF5D6C

## 2) Typography System

Use a two-family approach for personality and precision.

- Display and headings: Sora
- Body and UI text: Manrope
- Numeric and tabular data: JetBrains Mono

### Type Scale

- display.xl: 48/56, weight 700, letter spacing -0.02em
- display.lg: 40/48, weight 700, letter spacing -0.02em
- heading.h1: 32/40, weight 700
- heading.h2: 24/32, weight 700
- heading.h3: 20/28, weight 600
- title.card: 16/24, weight 600
- body.base: 14/22, weight 500
- body.sm: 13/20, weight 500
- caption: 12/16, weight 500
- metric.xl: 36/40, weight 700, family JetBrains Mono
- metric.md: 24/28, weight 700, family JetBrains Mono

### Usage Rules

- Keep dense dashboards at 14px base text for readability.
- Use mono only for values, percentages, and market ticks.
- Avoid all-caps for long labels; use title case for primary sections.

## 3) Card Styles

### Base Analytics Card

- Background: linear gradient from #121B2D to #0F1829
- Border: 1px solid #22314D
- Radius: 18px
- Padding: 20px desktop, 16px mobile
- Shadow: card.md token
- Hover: translateY(-2px), border to #30456B, shadow to card.glow

### Priority Insight Card

- Left accent bar: 3px gradient from #2DE2E6 to #4DA3FF
- Optional top-right pulse dot for live signals
- Use for recommendation and forecast confidence blocks

## 4) Button Styles

### Primary Button

- Background: linear gradient 135deg, #2B6FD6 to #2FAA65
- Text: #EAF2FF
- Radius: 12px
- Height: 42px
- Padding X: 16px
- Hover: brightness +8%, subtle outer glow
- Active: scale 0.98

### Secondary Button

- Background: #16233A
- Border: 1px solid #30456B
- Text: #B4C0D9
- Hover: background #1A2A45

### Ghost Button

- Background: transparent
- Text: #B4C0D9
- Hover: #121B2D with 1px #22314D border

## 5) Badge Styles (SELL / HOLD / PROFIT / LOSS)

All badges:

- Radius: 999px
- Height: 24px
- Padding X: 10px
- Font: 11/16, weight 700, letter spacing 0.04em

Badge variants:

- SELL:
  - bg: #3A1B17
  - text: #FF9A74
  - border: #7A3428
- HOLD:
  - bg: #3A2E15
  - text: #FFD78A
  - border: #7A5A1F
- PROFIT:
  - bg: #163523
  - text: #7FF0BA
  - border: #1E7F49
- LOSS:
  - bg: #3D1720
  - text: #FF9BA7
  - border: #8E2A3D

## 6) Shadow and Glow System

Use glow intentionally on high-value interaction points only.

- shadow.card.sm: 0 4px 14px rgba(3, 8, 20, 0.28)
- shadow.card.md: 0 12px 28px rgba(3, 8, 20, 0.36)
- shadow.card.lg: 0 24px 56px rgba(3, 8, 20, 0.5)
- shadow.inner.soft: inset 0 1px 0 rgba(255, 255, 255, 0.04)
- glow.blue.sm: 0 0 0 1px rgba(77, 163, 255, 0.30), 0 0 22px rgba(77, 163, 255, 0.18)
- glow.cyan.md: 0 0 0 1px rgba(45, 226, 230, 0.28), 0 0 28px rgba(45, 226, 230, 0.2)
- glow.green.sm: 0 0 0 1px rgba(47, 170, 101, 0.30), 0 0 20px rgba(47, 170, 101, 0.18)

## Tailwind Theme Extension Config

Add this inside your Tailwind theme extend block.

    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bg: {
          canvas: '#05080F',
          elevated: '#0B1220',
          card: '#121B2D',
          cardHover: '#16233A',
          overlay: '#03060E',
        },
        border: {
          soft: '#22314D',
          strong: '#30456B',
        },
        text: {
          primary: '#EAF2FF',
          secondary: '#B4C0D9',
          muted: '#7F92B8',
          inverse: '#08111F',
        },
        brand: {
          aiBlue: '#4DA3FF',
          aiBlueDeep: '#2B6FD6',
          neonCyan: '#2DE2E6',
          signalViolet: '#6F7CFF',
        },
        agri: {
          leaf: '#2FAA65',
          forest: '#1E7F49',
          mint: '#69D39A',
          soil: '#8D6B4F',
        },
        finance: {
          profit: '#1FD47A',
          loss: '#FF5D6C',
          hold: '#F7B955',
          sell: '#FF7A45',
        },
        chart: {
          1: '#4DA3FF',
          2: '#2DE2E6',
          3: '#2FAA65',
          4: '#F7B955',
          5: '#FF7A45',
          6: '#FF5D6C',
        },
        badge: {
          sellBg: '#3A1B17',
          sellText: '#FF9A74',
          sellBorder: '#7A3428',
          holdBg: '#3A2E15',
          holdText: '#FFD78A',
          holdBorder: '#7A5A1F',
          profitBg: '#163523',
          profitText: '#7FF0BA',
          profitBorder: '#1E7F49',
          lossBg: '#3D1720',
          lossText: '#FF9BA7',
          lossBorder: '#8E2A3D',
        },
      },
      boxShadow: {
        'card-sm': '0 4px 14px rgba(3, 8, 20, 0.28)',
        'card-md': '0 12px 28px rgba(3, 8, 20, 0.36)',
        'card-lg': '0 24px 56px rgba(3, 8, 20, 0.50)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.04)',
        'glow-blue': '0 0 0 1px rgba(77,163,255,0.30), 0 0 22px rgba(77,163,255,0.18)',
        'glow-cyan': '0 0 0 1px rgba(45,226,230,0.28), 0 0 28px rgba(45,226,230,0.20)',
        'glow-green': '0 0 0 1px rgba(47,170,101,0.30), 0 0 20px rgba(47,170,101,0.18)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2B6FD6 0%, #2FAA65 100%)',
        'card-gradient': 'linear-gradient(180deg, #121B2D 0%, #0F1829 100%)',
      },
      transitionTimingFunction: {
        'smooth-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    }

## Brand Motion Guidance

- Use subtle upward reveal for cards: 180ms to 260ms.
- Delay list items by 40ms increments for data loading sequences.
- Keep chart transitions under 500ms to preserve responsiveness.
- Apply glow only on focused and primary interactive elements.

