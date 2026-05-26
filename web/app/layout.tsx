import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { ToastHost } from "@/components/ToastHost";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <ToastHost />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
