import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kickoff — World Cup 2026 fan platform on X Layer",
    short_name: "Kickoff",
    description:
      "A free, global fan platform for World Cup 2026. Mint your Fan ID, complete on-chain quests, earn commemorative trophies, and run AI agents on X Layer.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e0a",
    theme_color: "#0a0e0a",
    orientation: "portrait-primary",
    categories: ["sports", "social", "games"],
    icons: [
      // app/icon.png is 400x400 — Next.js serves it at /icon.png with its
      // own auto-generated <link>. We add explicit manifest entries here
      // so PWA install screens (Android, Edge) pick the right size.
      { src: "/icon.png", sizes: "400x400", type: "image/png", purpose: "any" },
      {
        src: "/apple-icon.png",
        sizes: "400x400",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
