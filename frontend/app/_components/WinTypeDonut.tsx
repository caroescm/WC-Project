"use client";

import { useState, useEffect } from "react";

import { parseScore } from "./dateUtils";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number }
interface Fixture { group: string; result: string | null; prediction: Prediction }

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
    const p = parseScore(f.result!);
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
    <div className="card" style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--foreground)" }}>Win Types</span>
      </div>

      {/* Chart + legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>

        {/* Donut */}
        <svg viewBox="0 0 180 180" style={{ width: 210, height: 210, flexShrink: 0 }}>
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
            style={{ fontSize: 30, fontWeight: 400, fill: "var(--foreground)", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
            {goals}
          </text>
          <text x={CX} y={CY + 15} textAnchor="middle"
            style={{ fontSize: 11, fontWeight: 600, fill: "var(--svg-text)" }}>
            goals scored
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", marginLeft: "auto", paddingLeft: 28, paddingRight: 8 }}>
          {SLICES.map(({ key, label, color }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 0, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{label}</span>
              </div>
              <span className="num-lg" style={{ fontSize: "0.9375rem", fontWeight: 400, color: "var(--foreground)" }}>
                {isEmpty ? "—" : `${((counts[key] / total) * 100).toFixed(0)}%`}
              </span>
            </div>
          ))}

          {!isEmpty && (
            <div style={{ paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--border)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
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
