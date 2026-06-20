"use client";

import { motion } from "framer-motion";

interface AnimatedBarProps {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
}

export function AnimatedBar({ homeWin, draw, awayWin, homeTeam, awayTeam, compact = false }: AnimatedBarProps) {
  const h = Math.round(homeWin * 100);
  const d = Math.round(draw * 100);
  const a = Math.round(awayWin * 100);

  const dominant: "home" | "away" | "draw" =
    h >= a && h >= d ? "home" : a >= h && a >= d ? "away" : "draw";

  const homeColor = dominant === "home" ? "var(--accent)" : "var(--text-faint)";
  const awayColor = dominant === "away" ? "var(--accent)" : "var(--text-faint)";
  const drawColor = "var(--border)";

  const gradient = `linear-gradient(to right, ${homeColor} 0% ${h}%, ${drawColor} ${h}% ${h + d}%, ${awayColor} ${h + d}% 100%)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{homeTeam}</span>
            <span className="sport" style={{ fontSize: "2.25rem", color: dominant === "home" ? "var(--accent)" : "var(--text-faint)" }}>
              {h}%
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>Draw</span>
            <span className="sport" style={{ fontSize: "1.5rem", color: dominant === "draw" ? "#9ca3af" : "var(--text-faint)" }}>
              {d}%
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{awayTeam}</span>
            <span className="sport" style={{ fontSize: "2.25rem", color: dominant === "away" ? "var(--accent)" : "var(--text-faint)" }}>
              {a}%
            </span>
          </div>
        </div>
      )}

      <div style={{ position: "relative", width: "100%", borderRadius: 0, overflow: "hidden", height: compact ? 6 : 8, background: "var(--border)" }}>
        <motion.div
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 0, background: gradient }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {compact && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
          <span style={{ color: dominant === "home" ? "var(--accent)" : "var(--text-faint)" }}>{h}%</span>
          <span style={{ color: "var(--text-faint)" }}>{d}% draw</span>
          <span style={{ color: dominant === "away" ? "var(--accent)" : "var(--text-faint)" }}>{a}%</span>
        </div>
      )}
    </div>
  );
}
