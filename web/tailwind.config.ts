import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // sportsbook-meets-crypto dark palette
        pitch: {
          bg: "#0a0e0a",
          panel: "#121712",
          card: "#161d16",
          border: "#23302355",
        },
        grass: {
          DEFAULT: "#16c060",
          dark: "#0e7a3d",
          glow: "#3cf08a",
        },
        yes: "#16c060",
        no: "#f2545b",
        muted: "#7c8a7c",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(60,240,138,0.35)",
      },
      keyframes: {
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        ticker: "ticker-scroll 40s linear infinite",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
