import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Sidebar from "./sidebar";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm",
});

export const metadata: Metadata = {
  title: "FootballOdds",
  description: "FootballOdds — match predictions powered by Elo ratings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-page)" }}>
        <Sidebar />
        <main style={{ flex: 1, paddingTop: 80, padding: "80px 24px 32px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
