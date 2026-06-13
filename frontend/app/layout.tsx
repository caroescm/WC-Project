import type { Metadata } from "next";
import { Geist, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "WC 2026 Predictor",
  description: "World Cup 2026 match predictions powered by Elo ratings",
};

const navLinks = [
  { href: "/upcoming",  label: "Upcoming" },
  { href: "/archive",   label: "Archive"  },
  { href: "/predictor", label: "Rankings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${barlowCondensed.variable} ${geist.className}`}>
      <body className="min-h-screen flex flex-col">
        {/* ── Nav ─────────────────────────────────── */}
        <nav
          className="glass sticky top-0 z-50 px-8 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/" className="flex items-center gap-1.5 select-none">
            <span className="sport text-2xl" style={{ color: "var(--accent)" }}>WC</span>
            <span className="sport text-2xl" style={{ color: "var(--foreground)" }}>2026</span>
            <span
              className="ml-2 text-xs font-semibold tracking-widest uppercase hidden sm:block"
              style={{ color: "var(--text-muted)", letterSpacing: "0.18em" }}
            >
              Predictor
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {/* ── Page content ─────────────────────────── */}
        <main className="flex-1 px-8 py-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
