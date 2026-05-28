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
        // Classical "honor" accent — used only for top-3 ranks, the AI Champion
        // / Champion-of-Champions trophies, and the "you won" moments. Never
        // for navigation, never for CTAs (the grass green stays the action
        // colour to keep the OKX-aligned crypto-action feel).
        honor: {
          DEFAULT: "#d4af37",
          glow: "#f4d35e",
          dark: "#8b6914",
          ink: "#c79a26",
        },
        // Warm off-white used very sparingly for tabula panel ornament strokes
        // and classical hairline dividers — never as a fill.
        marble: {
          DEFAULT: "#e9e2cf",
          shade: "#bdb39a",
        },
        yes: "#16c060",
        no: "#f2545b",
        muted: "#7c8a7c",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Display-only face: used for page H1s, top-3 ranks, champion-trophy
        // titles. Strictly NOT for body copy (it loses legibility under ~18px).
        display: ["var(--font-cinzel)", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(60,240,138,0.35)",
        honor: "0 0 28px -8px rgba(244,211,94,0.45)",
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
