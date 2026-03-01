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
        border: "#e8e6dc",
        input: "#e8e6dc",
        ring: "#d97757",
        background: "#faf9f5",
        foreground: "#141413",
        primary: {
          DEFAULT: "#d97757",
          foreground: "#faf9f5",
        },
        secondary: {
          DEFAULT: "#e8e6dc",
          foreground: "#141413",
        },
        muted: {
          DEFAULT: "#e8e6dc",
          foreground: "#b0aea5",
        },
        accent: {
          DEFAULT: "#6a9bcc",
          foreground: "#faf9f5",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#141413",
        },
        anthropic: {
          dark: '#141413',
          light: '#faf9f5',
          mid: '#b0aea5',
          lightGray: '#e8e6dc',
          orange: '#d97757',
          blue: '#6a9bcc',
          green: '#788c5d'
        }
      },
      fontFamily: {
        sans: ['Lora', 'Georgia', 'serif'],
        heading: ['Poppins', 'Arial', 'sans-serif'],
        body: ['Lora', 'Georgia', 'serif'],
        barlow: ['Barlow', 'sans-serif'],
        'barlow-condensed': ['"Barlow Condensed"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
