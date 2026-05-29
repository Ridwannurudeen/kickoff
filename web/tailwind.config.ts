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
        // Display-only face: a bold condensed sports face for page H1s, big
        // scorelines, top-3 ranks, and trophy titles. NOT for body copy.
        display: [
          "var(--font-display)",
          '"Arial Narrow"',
          "system-ui",
          "sans-serif",
        ],
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
        // Subtle entrance: slide up 8px + fade in. Used on hero blocks, stat
        // cards, and pillar cards. Stagger by overriding `animation-delay`.
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Slow gold-honor breathing for champion-trophy glow. 4s loop, gentle.
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 28px -10px rgba(244,211,94,0.35)",
          },
          "50%": {
            boxShadow: "0 0 36px -8px rgba(244,211,94,0.55)",
          },
        },
        // Border shimmer for pillar cards on hover — a thin specular sweep
        // across the top edge. Applied via a `::before` pseudo or a child div.
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // 3-step podium stagger — each step rises into place. Used together
        // with `animation-delay` per step in Podium.tsx.
        "podium-rise": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.97)" },
          "60%": { opacity: "1", transform: "translateY(-2px) scale(1.01)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        ticker: "ticker-scroll 40s linear infinite",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "podium-rise": "podium-rise 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
