"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SimEntry = { r32: number; r16: number; qf: number; sf: number; final: number; winner: number };

interface Tooltip {
  team: string;
  winner: number;
  final: number;
  sf: number;
  x: number;
  y: number;
}

const BAR_COLORS = {
  winner: "#3730a3",
  final:  "#6366f1",
  sf:     "#a5b4fc",
};

const CHART_H = 210;

export default function TournamentOutlook({ simulation }: { simulation: Record<string, SimEntry> }) {
  const [tooltip,   setTooltip] = useState<Tooltip | null>(null);
  const [mounted,     setMounted]     = useState(false);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [expandHover, setExpandHover] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const ranked = Object.entries(simulation)
    .sort(([, a], [, b]) => b.winner - a.winner)
    .slice(0, 10);

  if (ranked.length === 0) {
    return (
      <div className="card" style={{ padding: "20px 24px" }}>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)", margin: 0 }}>Simulation unavailable.</p>
      </div>
    );
  }

  // Dynamic ceiling: round the highest SF value up to the nearest 10%
  const maxSF  = Math.max(...ranked.map(([, p]) => p.sf));
  const yMax   = Math.ceil(maxSF / 0.10) * 0.10;
  const ySteps = Array.from({ length: Math.round(yMax / 0.10) + 1 }, (_, i) => i * 0.10);

  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0e1420" }}>Tournament Outlook</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 3 }}>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Monte Carlo simulation · 3,000 rounds</span>
            {([
              { label: "Winner",     color: BAR_COLORS.winner },
              { label: "Final",      color: BAR_COLORS.final  },
              { label: "Semi-final", color: BAR_COLORS.sf     },
            ] as const).map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.6875rem", color: "#374151" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/montecarlo"
          onMouseEnter={() => setExpandHover(true)}
          onMouseLeave={() => setExpandHover(false)}
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color:      expandHover ? "#ffffff" : "#3730a3",
            background: expandHover ? "#3730a3" : "transparent",
            border:    `1.5px solid ${expandHover ? "#3730a3" : "#3730a3"}`,
            borderRadius: 20,
            padding: "5px 16px",
            textDecoration: "none",
            whiteSpace: "nowrap",
            transition: "background 0.18s ease, color 0.18s ease",
          }}
        >
          Expand
        </Link>
      </div>

      {/* ── Chart ── */}
      <div style={{ position: "relative" }}>

        {/* Y-axis + gridlines */}
        <div style={{ position: "relative", height: CHART_H, paddingLeft: 36, marginTop: 8 }}>
          {ySteps.map(pct => {
            const top = ((yMax - pct) / yMax) * CHART_H;
            return (
              <div key={pct} style={{ position: "absolute", top, left: 0, right: 0, display: "flex", alignItems: "center", transform: "translateY(-50%)" }}>
                <span style={{ width: 30, fontSize: "0.625rem", color: "#6b7280", textAlign: "right", flexShrink: 0, userSelect: "none" }}>
                  {(pct * 100).toFixed(0)}%
                </span>
                <div style={{ flex: 1, height: 1, background: pct === 0 ? "var(--border)" : "var(--border)", opacity: pct === 0 ? 1 : 0.5, marginLeft: 6 }} />
              </div>
            );
          })}

          {/* Bars */}
          <div style={{ position: "absolute", inset: 0, left: 36, display: "flex", alignItems: "flex-end", gap: 6 }}>
            {ranked.map(([team, p], teamIdx) => (
              <div
                key={team}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}
                onMouseEnter={e => { setTooltip({ team, winner: p.winner, final: p.final, sf: p.sf, x: e.clientX, y: e.clientY }); setHoveredTeam(team); }}
                onMouseMove={e  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => { setTooltip(null); setHoveredTeam(null); }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: CHART_H, cursor: "crosshair" }}>
                  {([
                    { key: "winner", val: p.winner, color: BAR_COLORS.winner },
                    { key: "final",  val: p.final,  color: BAR_COLORS.final  },
                    { key: "sf",     val: p.sf,     color: BAR_COLORS.sf     },
                  ] as const).map(({ key, val, color }, barIdx) => (
                    <div
                      key={key}
                      style={{
                        width: 24,
                        height: Math.max(3, (val / yMax) * CHART_H),
                        background: color,
                        borderRadius: "3px 3px 0 0",
                        transformOrigin: "bottom",
                        transform: [
                          mounted ? "scaleY(1)" : "scaleY(0)",
                          hoveredTeam === team ? "scaleY(1.04)" : "",
                        ].filter(Boolean).join(" "),
                        transition: [
                          `transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${teamIdx * 55 + barIdx * 20}ms`,
                          "opacity 0.15s ease",
                          "filter 0.15s ease",
                        ].join(", "),
                        opacity: hoveredTeam && hoveredTeam !== team ? 0.35 : 1,
                        filter: hoveredTeam === team ? "brightness(1.12)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* X-axis labels */}
        <div style={{ display: "flex", gap: 6, paddingLeft: 36, marginTop: 12 }}>
          {ranked.map(([team]) => (
            <div
              key={team}
              style={{
                flex: 1, textAlign: "center",
                fontSize: "0.6875rem", color: "#374151",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {team}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div style={{
          position: "fixed",
          top: tooltip.y - 90,
          left: tooltip.x - 64,
          background: "#0e1420",
          color: "#fff",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: "0.75rem",
          pointerEvents: "none",
          zIndex: 200,
          minWidth: 128,
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5 }}>{tooltip.team}</div>
          {([
            { label: "Winner",     val: tooltip.winner, color: BAR_COLORS.winner },
            { label: "Final",      val: tooltip.final,  color: BAR_COLORS.final  },
            { label: "Semi-final", val: tooltip.sf,     color: BAR_COLORS.sf     },
          ] as const).map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
              <span style={{ color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: color, display: "inline-block" }} />
                {label}
              </span>
              <span style={{ fontWeight: 600 }}>{(val * 100).toFixed(1)}%</span>
            </div>
          ))}
          {/* caret */}
          <div style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, background: "#0e1420",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }} />
        </div>
      )}
    </div>
  );
}
