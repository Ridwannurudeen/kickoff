import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kickoff — Trade the beautiful game",
    short_name: "Kickoff",
    description:
      "Live, on-chain FIFA World Cup 2026 prediction markets on X Layer.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e0a",
    theme_color: "#16c060",
  };
}
