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
  };
}
