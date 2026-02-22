/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "#2C2C2E",
        input: "#2C2C2E",
        ring: "#FA2D48",
        background: "#000000",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#FA2D48",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1C1C1E",
          foreground: "#EBEBF5",
        },
        muted: {
          DEFAULT: "#2C2C2E",
          foreground: "#8E8E93",
        },
        accent: {
          DEFAULT: "#2C2C2E",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#1C1C1E",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        barlow: ['Barlow', 'sans-serif'],
        'barlow-condensed': ['"Barlow Condensed"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
