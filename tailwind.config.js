/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "#2A2A2A",
        input: "#1A1A1A",
        ring: "#FFFFFF",
        background: "#050505",
        foreground: "#F5F5F5",
        primary: {
          DEFAULT: "#FFFFFF",
          foreground: "#050505",
        },
        secondary: {
          DEFAULT: "#121212",
          foreground: "#F5F5F5",
        },
        muted: {
          DEFAULT: "#A0A0A0",
          foreground: "#A0A0A0",
        },
        accent: {
          DEFAULT: "#3BBFBF",
          foreground: "#050505",
        },
        card: {
          DEFAULT: "#121212",
          foreground: "#F5F5F5",
        },
        anthropic: {
          dark: "#050505",
          light: "#121212",
          mid: "#A0A0A0",
          lightGray: "#1A1A1A",
          orange: "#E8806A",
          blue: "#3BBFBF",
          green: "#3BBFBF",
        },
      },
      fontFamily: {
        sans: ['"Epilogue"', "sans-serif"],
        heading: ['"Syne"', "sans-serif"],
        body: ['"Epilogue"', "sans-serif"],
        barlow: ["Barlow", "sans-serif"],
        "barlow-condensed": ['"Barlow Condensed"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
