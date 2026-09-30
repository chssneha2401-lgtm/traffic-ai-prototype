/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Operations-center palette (mirrors CSS variables in globals.css)
        ops: {
          bg: '#0a0f1e',
          surface: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
          cyan: '#00e5ff',
          teal: '#14b8a6',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          gray: '#64748b',
        },
        // Legacy aliases kept so existing classes keep working during the redesign
        traffic: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          dark: '#0a0f1e',
          card: '#1e293b',
          accent: '#00e5ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
