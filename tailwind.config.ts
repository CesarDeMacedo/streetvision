import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f1a',
        panel: '#111a2b',
        'panel-2': '#0d1524',
        line: '#1e2b42',
        ink: '#e7ecf5',
        muted: '#8b96ac',
        accent: '#3b82f6',
        'accent-dim': '#1d3a63',
      },
    },
  },
  plugins: [],
}
export default config
