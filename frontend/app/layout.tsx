import type { Metadata } from "next";
import { Geist, Barlow_Condensed } from "next/font/google";
import Sidebar from "./sidebar";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "FootballOdds",
  description: "FootballOdds — match predictions powered by Elo ratings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${barlowCondensed.variable} ${geist.className}`}>
      <body style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 32px",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
