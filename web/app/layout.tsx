import type { Metadata, Viewport } from "next";
import { Inter, Anton } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { ToastHost } from "@/components/ToastHost";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Anton — bold condensed sports display face for page H1s, big scorelines,
// top-3 ranks, and trophy titles. Single weight (400) by design; never used
// for body copy.
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://kickoff.gudman.xyz";
const SITE_TITLE = "Kickoff — Your World Cup, on-chain";
const SITE_DESCRIPTION =
  "A free, global fan platform for World Cup 2026. Mint your Fan ID, complete on-chain quests, earn commemorative trophies, and run AI agents on X Layer.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · Kickoff" },
  description: SITE_DESCRIPTION,
  applicationName: "Kickoff",
  authors: [{ name: "Kickoff" }],
  keywords: [
    "World Cup 2026",
    "X Layer",
    "OKX",
    "OKB",
    "Fan Reputation",
    "on-chain",
    "AI Agent",
    "Bring Your Own Agent",
    "AgentLeague",
    "BuildX",
  ],
  // Next.js auto-injects icon links from app/icon.png + app/apple-icon.png.
  // The explicit entries here add the SVG variant so browsers that prefer
  // vector icons (Safari pinned tabs, modern Chrome) pick it up too.
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "400x400" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-icon.png", type: "image/png", sizes: "400x400" },
  },
  openGraph: {
    type: "website",
    siteName: "Kickoff",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    // Next.js auto-attaches the app/opengraph-image.png as og:image. We
    // omit the explicit images[] here so the auto-handler stays in charge
    // (which adds the correct width/height/alt at build time).
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: "@kickoff_w2026",
    creator: "@kickoff_w2026",
    // Same — app/twitter-image.png auto-attaches.
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0e0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <Header />
          <main id="main" className="mx-auto max-w-7xl px-4 py-8">
            {children}
          </main>
          <ToastHost />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
