import type { Metadata, Viewport } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { ToastHost } from "@/components/ToastHost";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Cinzel — display-only face for page H1s, top-3 ranks, and champion-trophy
// titles. Restrained: never used for body copy, never below 18 px in practice.
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kickoff — Your World Cup, on-chain",
  description:
    "A free, global fan platform for World Cup 2026. Mint your Fan ID, complete on-chain quests, earn commemorative trophies, and run AI agents on X Layer.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <Header />
          <main id="main" className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <ToastHost />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
