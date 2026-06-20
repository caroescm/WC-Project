import type { Metadata } from "next";
import Script from "next/script";
import Sidebar from "./sidebar";
import SplashScreen from "./_components/SplashScreen";
import "./globals.css";

export const metadata: Metadata = {
  title: "FootballOdds",
  description: "FootballOdds — match predictions powered by Elo ratings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-page)" }}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));})();` }}
        />
        <SplashScreen />
        <Sidebar />
        <main style={{ flex: 1, padding: "80px 28px 8px", maxWidth: 1296, margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
