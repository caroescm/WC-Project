import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WC 2026 Predictor",
  description: "World Cup 2026 match predictions powered by Elo ratings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <nav style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }} className="px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" style={{ color: "var(--accent)" }} className="text-xl font-bold tracking-tight">
            WC 2026
          </Link>
          <div className="flex gap-8 text-sm font-medium">
            <Link href="/upcoming" className="hover:opacity-70 transition-opacity" style={{ color: "var(--foreground)" }}>
              Upcoming
            </Link>
            <Link href="/archive" className="hover:opacity-70 transition-opacity" style={{ color: "var(--foreground)" }}>
              Archive
            </Link>
            <Link href="/predictor" className="hover:opacity-70 transition-opacity" style={{ color: "var(--foreground)" }}>
              Tournament
            </Link>
          </div>
        </nav>
        <main className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
