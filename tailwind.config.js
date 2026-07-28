/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B2545',
          navyLight: '#154574',
          navyDark: '#071B33',
          orange: '#F26522',
          orangeLight: '#FF8A4C',
          cream: '#FFF4E8',
          mist: '#EAF0F6',
        },
        surface: {
          base: '#F4F6F8',
          card: '#FFFEFC',
          border: '#DDE3EA',
        },
      },
      borderRadius: {
        card: '24px',
        input: '14px',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 2px rgba(7,27,51,0.04), 0 10px 30px rgba(7,27,51,0.035)',
        'card-hover': '0 16px 38px rgba(7,27,51,0.09), 0 2px 6px rgba(7,27,51,0.05)',
        'sidebar': '8px 0 40px rgba(7,27,51,0.12)',
      },
    },
  },
  plugins: [],
};
