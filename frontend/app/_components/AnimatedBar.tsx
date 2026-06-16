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

export function AnimatedBar({
  homeWin,
  draw,
  awayWin,
  homeTeam,
  awayTeam,
  compact = false,
}: AnimatedBarProps) {
  const h = Math.round(homeWin * 100);
  const d = Math.round(draw * 100);
  const a = Math.round(awayWin * 100);

  const dominant: "home" | "away" | "draw" =
    h >= a && h >= d ? "home" : a >= h && a >= d ? "away" : "draw";

  const homeColor = dominant === "home" ? "var(--accent)" : "var(--text-faint)";
  const awayColor = dominant === "away" ? "var(--accent)" : "var(--text-faint)";
  const drawColor = "var(--border)";

  const gradient = `linear-gradient(to right,
    ${homeColor} 0% ${h}%,
    ${drawColor} ${h}% ${h + d}%,
    ${awayColor} ${h + d}% 100%)`;

  return (
    <div className="flex flex-col gap-2 w-full">
      {!compact && (
        <div className="flex justify-between items-end mb-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{homeTeam}</span>
            <span
              className="sport text-4xl"
              style={{ color: dominant === "home" ? "var(--accent)" : "var(--text-faint)" }}
            >
              {h}%
            </span>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>Draw</span>
            <span className="sport text-2xl" style={{ color: dominant === "draw" ? "#9ca3af" : "var(--text-faint)" }}>
              {d}%
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{awayTeam}</span>
            <span
              className="sport text-4xl"
              style={{ color: dominant === "away" ? "var(--accent)" : "var(--text-faint)" }}
            >
              {a}%
            </span>
          </div>
        </div>
      )}

      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{ height: compact ? 6 : 8, background: "var(--border)" }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: gradient }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {compact && (
        <div className="flex justify-between text-xs">
          <span style={{ color: dominant === "home" ? "var(--accent)" : "var(--text-faint)" }}>
            {h}%
          </span>
          <span style={{ color: "var(--text-faint)" }}>{d}% draw</span>
          <span style={{ color: dominant === "away" ? "var(--accent)" : "var(--text-faint)" }}>
            {a}%
          </span>
        </div>
      )}
    </div>
  );
}
