/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#012E6C',
          navyLight: '#0A4A9E',
          navyDark: '#011D47',
          orange: '#F7931E',
          orangeLight: '#FFB35C',
        },
        surface: {
          base: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
      },
      borderRadius: {
        card: '20px',
        input: '12px',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.06), 0 1px 3px 0 rgba(0,0,0,0.04)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
