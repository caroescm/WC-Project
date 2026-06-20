"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SimEntry = { r32: number; r16: number; qf: number; sf: number; final: number; winner: number };
type Filter   = "all" | "winner" | "final" | "sf";

interface TooltipState { team: string; p: SimEntry; x: number; y: number }

const COLORS = { winner: "#C9981A", final: "#1B4332", sf: "#A8C3B0" };

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",    label: "All"       },
  { key: "winner", label: "Winner"    },
  { key: "final",  label: "Final"     },
  { key: "sf",     label: "Semifinal" },
];

const CHART_H = 150;

export default function TournamentOutlook({ simulation, maxTeams = 7 }: { simulation: Record<string, SimEntry>; maxTeams?: number }) {
  const [filter,  setFilter]  = useState<Filter>("all");
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [filter]);

  const ranked = Object.entries(simulation)
    .sort(([, a], [, b]) => b.winner - a.winner)
    .slice(0, maxTeams);

  if (ranked.length === 0) {
    return (
      <div className="card" style={{ padding: "10px 14px 14px" }}>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)", margin: 0 }}>Simulation unavailable.</p>
      </div>
    );
  }

  const getVal = (p: SimEntry) =>
    filter === "winner" ? p.winner : filter === "final" ? p.final : p.sf;

  const maxVal = Math.max(...ranked.map(([, p]) => getVal(p)));
  const yMax   = Math.ceil(maxVal / 0.05) * 0.05 || 0.05;
  const ySteps = [0, 0.25, 0.5, 0.75, 1].map(f => f * yMax);

  return (
    <div className="card" style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--foreground)" }}>Monte Carlo Simulation</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="toggle-track" style={{ display: "flex", background: "var(--toggle-track)", borderRadius: 0, padding: 3, gap: 2 }}>
            {FILTERS.map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding: "4px 12px",
                fontSize: "0.625rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 0,
                cursor: "pointer",
                background: filter === key ? "#2E8B57" : "transparent",
                color:      filter === key ? "#ffffff"  : "var(--toggle-inactive)",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}>
                {label}
              </button>
            ))}
          </div>
          <Link href="/predictions" className="back-link">
            See All ↗
          </Link>
        </div>
      </div>

      {/* ── Legend (always occupies space, hidden when not in All mode) ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", visibility: filter === "all" ? "visible" : "hidden" }}>
        {(["winner", "final", "sf"] as const).map(k => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 0, background: COLORS[k], flexShrink: 0 }} />
            <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>
              {k === "winner" ? "Winner" : k === "final" ? "Final" : "Semifinal"}
            </span>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "relative", height: CHART_H, paddingLeft: 36, marginTop: 10 }}>

          {/* Gridlines */}
          {ySteps.map((pct, i) => {
            const top = ((yMax - pct) / yMax) * CHART_H;
            return (
              <div key={i} style={{ position: "absolute", top, left: 0, right: 0, display: "flex", alignItems: "center", transform: "translateY(-50%)" }}>
                <span className="num" style={{ width: 30, fontSize: "0.5625rem", color: "var(--text-faint)", textAlign: "right", flexShrink: 0 }}>
                  {(pct * 100).toFixed(0)}%
                </span>
                <div style={{ flex: 1, height: 1, background: "#e9e6f4", marginLeft: 6, opacity: i === 0 ? 1 : 0.6 }} />
              </div>
            );
          })}

          {/* Bars */}
          <div style={{ position: "absolute", inset: 0, left: 36, display: "flex", alignItems: "flex-end", gap: 4 }}>
            {ranked.map(([team, p]) => {
              const fade = hovered !== null && hovered !== team;

              if (filter === "all") {
                const wH  = mounted ? Math.max(2,  (p.winner              / yMax) * CHART_H) : 0;
                const fH  = mounted ? Math.max(0, ((p.final  - p.winner)  / yMax) * CHART_H) : 0;
                const sfH = mounted ? Math.max(0, ((p.sf     - p.final)   / yMax) * CHART_H) : 0;
                return (
                  <div
                    key={team}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "default" }}
                    onMouseEnter={e => { setHovered(team); setTooltip({ team, p, x: e.clientX, y: e.clientY }); }}
                    onMouseMove={e  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: CHART_H, width: "100%", maxWidth: 32 }}>
                      <div style={{ height: wH,  background: COLORS.winner, borderRadius: 0, opacity: fade ? 0.3 : 1, transition: "height 0.5s cubic-bezier(0.34,1.2,0.64,1), opacity 0.15s" }} />
                      <div style={{ height: fH,  background: COLORS.final,                               opacity: fade ? 0.3 : 1, transition: "height 0.5s cubic-bezier(0.34,1.2,0.64,1) 30ms, opacity 0.15s" }} />
                      <div style={{ height: sfH, background: COLORS.sf,                                  opacity: fade ? 0.3 : 1, transition: "height 0.5s cubic-bezier(0.34,1.2,0.64,1) 60ms, opacity 0.15s" }} />
                    </div>
                  </div>
                );
              }

              const val  = getVal(p);
              const barH = mounted ? Math.max(3, (val / yMax) * CHART_H) : 0;
              const color = filter === "winner" ? COLORS.winner : filter === "final" ? COLORS.final : COLORS.sf;
              return (
                <div
                  key={team}
                  style={{ flex: 1, display: "flex", alignItems: "flex-end", cursor: "default" }}
                  onMouseEnter={e => { setHovered(team); setTooltip({ team, p, x: e.clientX, y: e.clientY }); }}
                  onMouseMove={e  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                >
                  <div style={{
                    height: barH, width: "100%", maxWidth: 32,
                    background: color,
                    borderRadius: 0,
                    opacity: fade ? 0.3 : 1,
                    transition: "height 0.45s cubic-bezier(0.34,1.2,0.64,1), opacity 0.15s",
                  }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div style={{ display: "flex", gap: 4, paddingLeft: 36, marginTop: 4 }}>
          {ranked.map(([team]) => (
            <div key={team} style={{ flex: 1, textAlign: "center", fontSize: "0.5625rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {team}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div style={{
          position: "fixed",
          top: tooltip.y - 100,
          left: tooltip.x - 72,
          background: "#10241A",
          color: "#fff",
          borderRadius: 0,
          padding: "8px 12px",
          fontSize: "0.6875rem",
          pointerEvents: "none",
          zIndex: 999,
          minWidth: 140,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5 }}>{tooltip.team}</div>
          {([
            { label: "Winner",    val: tooltip.p.winner, color: COLORS.winner },
            { label: "Final",     val: tooltip.p.final,  color: COLORS.final  },
            { label: "Semifinal", val: tooltip.p.sf,     color: COLORS.sf     },
          ] as const).map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
              <span style={{ color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 0, background: color, display: "inline-block" }} />
                {label}
              </span>
              <span className="num" style={{ fontWeight: 600 }}>{(val * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
