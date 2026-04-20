/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#fafaf5",
        surface: "#fafaf5",
        "surface-bright": "#fafaf5",
        "surface-dim": "#d8dbd3",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4ee",
        "surface-container": "#edefe8",
        "surface-container-high": "#e7e9e2",
        "surface-container-highest": "#e0e4dc",
        "surface-variant": "#e0e4dc",
        primary: "#24686b",
        "primary-dim": "#135c5e",
        "primary-container": "#adeef0",
        secondary: "#486467",
        "secondary-container": "#cae8eb",
        tertiary: "#546353",
        "tertiary-container": "#edfee9",
        error: "#a83836",
        "on-surface": "#2f342e",
        "on-surface-variant": "#5c605a",
        "on-primary": "#e1ffff",
        "on-primary-container": "#105b5d",
        "on-secondary-container": "#3a5659",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
        label: ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(36, 104, 107, 0.12)",
        float: "0 12px 32px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
}
