import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Sidebar from "./sidebar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm",
});

export const metadata: Metadata = {
  title: "FootballOdds",
  description: "FootballOdds — match predictions powered by Elo ratings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-page)" }}>
        <Sidebar />
        <main style={{ flex: 1, paddingTop: 80, padding: "60px 48px 8px", maxWidth: 1296, margin: "0 auto", width: "100%" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
