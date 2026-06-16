"use client";

import { useState, useEffect } from "react";
import { parseMatchDateUTC } from "./dateUtils";

function getTimeLeft(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Live now";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

interface CountdownProps {
  nextDate: string;
  homeTeam: string;
  awayTeam: string;
  group: string;
}

export function Countdown({ nextDate, homeTeam, awayTeam, group }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const target = parseMatchDateUTC(nextDate);
    const tick = () => setTimeLeft(getTimeLeft(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextDate]);

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg px-4 py-2.5"
      style={{
        background: "var(--accent-light)",
        border: "1px solid var(--accent-dim)",
      }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Next · {group}
        </span>
        <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
          {homeTeam}{" "}
          <span style={{ color: "var(--text-faint)" }}>vs</span>{" "}
          {awayTeam}
        </span>
      </div>
      <span
        className="sport text-2xl flex-shrink-0"
        style={{ color: "var(--accent)" }}
        suppressHydrationWarning
      >
        {timeLeft || "—"}
      </span>
    </div>
  );
}
