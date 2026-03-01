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
        border: "#2E2E2C",
        input: "#3A3A37",
        ring: "#E8806A",
        background: "#1C1C1A",
        foreground: "#EDEAE2",
        primary: {
          DEFAULT: "#E8806A",
          foreground: "#1C1C1A",
        },
        secondary: {
          DEFAULT: "#252523",
          foreground: "#EDEAE2",
        },
        muted: {
          DEFAULT: "#9E9C95",
          foreground: "#9E9C95",
        },
        accent: {
          DEFAULT: "#3BBFBF",
          foreground: "#1C1C1A",
        },
        card: {
          DEFAULT: "#252523",
          foreground: "#EDEAE2",
        },
        anthropic: {
          dark: '#1C1C1A',
          light: '#252523',
          mid: '#9E9C95',
          lightGray: '#3A3A37',
          orange: '#E8806A',
          blue: '#3BBFBF',
          green: '#3BBFBF'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        heading: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        barlow: ['Barlow', 'sans-serif'],
        'barlow-condensed': ['"Barlow Condensed"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
