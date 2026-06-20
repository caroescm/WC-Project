"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number }
interface Fixture { group: string; result: string | null; prediction: Prediction }

function parseResult(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

const SLICES = [
  { key: "home",  label: "Home Wins", color: "#C9981A" },
  { key: "draw",  label: "Draws",     color: "#1B4332" },
  { key: "away",  label: "Away Wins", color: "#A8C3B0" },
] as const;

const R  = 70;
const CX = 90;
const CY = 90;
const C  = 2 * Math.PI * R;

export default function WinTypeDonut({ played }: { played: Fixture[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  const groupPlayed = played.filter(f => f.group && f.result);

  let home = 0, draw = 0, away = 0, goals = 0;
  for (const f of groupPlayed) {
    const p = parseResult(f.result!);
    if (!p) continue;
    const [hs, as_] = p;
    goals += hs + as_;
    if (hs > as_) home++;
    else if (hs < as_) away++;
    else draw++;
  }

  const total   = home + draw + away;
  const isEmpty = total === 0;

  const counts  = { home, draw, away };
  const lengths = isEmpty
    ? { home: C / 3, draw: C / 3, away: C / 3 }
    : { home: (home / total) * C, draw: (draw / total) * C, away: (away / total) * C };

  const offsets = {
    home: 0,
    draw: lengths.home,
    away: lengths.home + lengths.draw,
  };

  return (
    <div className="card" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>Win Types</span>
        <Link href="/groups" className="back-link">
          See All ↗
        </Link>
      </div>

      {/* Chart + legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>

        {/* Donut */}
        <svg viewBox="0 0 180 180" style={{ width: 160, height: 160, flexShrink: 0 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E8F0EA" strokeWidth={32} />
          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {SLICES.map(({ key, color }, i) => (
              <circle
                key={key}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={color}
                strokeWidth={32}
                strokeDasharray={mounted
                  ? `${lengths[key].toFixed(2)} ${(C - lengths[key]).toFixed(2)}`
                  : `0 ${C.toFixed(2)}`}
                strokeDashoffset={(-offsets[key]).toFixed(2)}
                opacity={isEmpty ? 0.25 : 1}
                style={{ transition: `stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1) ${i * 120}ms` }}
              />
            ))}
          </g>
          <text x={CX} y={CY - 4} textAnchor="middle"
            style={{ fontSize: 30, fontWeight: 800, fill: "#10241A", fontFamily: "inherit" }}>
            {goals}
          </text>
          <text x={CX} y={CY + 15} textAnchor="middle"
            style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}>
            goals scored
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, paddingLeft: 12 }}>
          {SLICES.map(({ key, label, color }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.875rem", color: "var(--foreground)" }}>{label}</span>
              </div>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--foreground)" }}>
                {isEmpty ? "—" : `${((counts[key] / total) * 100).toFixed(0)}%`}
              </span>
            </div>
          ))}

          {!isEmpty && (
            <div style={{ paddingTop: 6, borderTop: "1px solid var(--border)", fontSize: "0.6875rem", color: "var(--text-muted)" }}>
              {total} group stage matches
            </div>
          )}
        </div>
      </div>

      {isEmpty && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", margin: 0, textAlign: "center" }}>
          Awaiting first group stage results.
        </p>
      )}
    </div>
  );
}
