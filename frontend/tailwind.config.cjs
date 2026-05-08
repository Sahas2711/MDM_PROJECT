/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme=dark]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          neonCyan: '#2DE2E6',
        },
        bg: {
          canvas:    '#F5F8F4',
          base:      '#F5F8F4',
          elevated:  '#FFFFFF',
          card:      '#FCFEFB',
          cardHover: '#EFF5EE',
          glass:     'rgba(255,255,255,0.82)',
        },
        border: {
          soft:   '#D7E5DA',
          strong: '#A7C8AE',
          glow:   '#2FAA65',
        },
        text: {
          primary:   '#153124',
          secondary: '#496556',
          muted:     '#6F8779',
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
          holdText:    '#F59E0B',
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
        agri: {
          leaf: '#2FAA65',
        },
      },
      boxShadow: {
        'card-sm':     '0 12px 28px rgba(19,49,36,0.08)',
        'card-md':     '0 18px 40px rgba(19,49,36,0.1)',
        'glass':      '0 18px 60px rgba(19,49,36,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
        'glow-green': '0 0 0 1px rgba(47,170,101,0.16), 0 22px 48px rgba(47,170,101,0.12)',
        'glow-cyan':  '0 0 0 1px rgba(45,226,230,0.16), 0 22px 48px rgba(45,226,230,0.1)',
        'card':       '0 16px 40px rgba(19,49,36,0.08)',
        'card-lg':    '0 24px 70px rgba(19,49,36,0.12)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #1F7A45 0%, #2FAA65 55%, #7ED7CB 100%)',
        'green-gradient':  'linear-gradient(135deg, #1F7A45 0%, #2FAA65 100%)',
        'card-gradient':   'linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(244,249,244,0.96) 100%)',
        'sidebar-gradient':'linear-gradient(180deg, #FFFFFF 0%, #F2F7F2 100%)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
}
