/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          canvas:    '#030A06',
          elevated:  '#071210',
          card:      '#0C1A14',
          cardHover: '#112019',
          glass:     'rgba(12,26,20,0.7)',
        },
        border: {
          soft:   '#1A3028',
          strong: '#245040',
          glow:   '#2FAA65',
        },
        text: {
          primary:   '#E8F5EE',
          secondary: '#9DBFAD',
          muted:     '#5A8A72',
        },
        green: {
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          neon: '#2FAA65',
          deep: '#0D5C35',
          glow: 'rgba(47,170,101,0.25)',
        },
        cyan: {
          neon: '#2DE2E6',
        },
        blue: {
          ai: '#4DA3FF',
        },
        badge: {
          sellBg:      '#1A2E1A',
          sellText:    '#4ADE80',
          sellBorder:  '#2FAA65',
          holdBg:      '#2A2510',
          holdText:    '#FCD34D',
          holdBorder:  '#92400E',
          donotBg:     '#2A0F0F',
          donotText:   '#F87171',
          donotBorder: '#7F1D1D',
          profitBg:    '#0F2A1A',
          profitText:  '#6EE7B7',
          profitBorder:'#065F46',
          lossBg:      '#2A0F0F',
          lossText:    '#FCA5A5',
          lossBorder:  '#7F1D1D',
        },
      },
      boxShadow: {
        'glass':      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(47,170,101,0.1)',
        'glow-green': '0 0 0 1px rgba(47,170,101,0.3), 0 0 30px rgba(47,170,101,0.2)',
        'glow-cyan':  '0 0 0 1px rgba(45,226,230,0.3), 0 0 30px rgba(45,226,230,0.15)',
        'card':       '0 4px 24px rgba(0,0,0,0.5)',
        'card-lg':    '0 12px 48px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #0D5C35 0%, #2FAA65 50%, #2DE2E6 100%)',
        'green-gradient':  'linear-gradient(135deg, #0D5C35 0%, #2FAA65 100%)',
        'card-gradient':   'linear-gradient(160deg, rgba(12,26,20,0.9) 0%, rgba(7,18,16,0.95) 100%)',
        'sidebar-gradient':'linear-gradient(180deg, #071210 0%, #030A06 100%)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
}
