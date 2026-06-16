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
      <body style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" style={{ background: "var(--bg-page)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
