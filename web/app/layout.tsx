import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { ToastHost } from "@/components/ToastHost";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Kickoff — Trade the beautiful game",
  description:
    "Live, on-chain FIFA World Cup 2026 prediction markets on X Layer.",
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
          <footer className="border-t border-pitch-border py-6 text-center text-xs text-muted">
            Kickoff · Trade the beautiful game — live, on-chain · X Layer
          </footer>
        </Providers>
      </body>
    </html>
  );
}
