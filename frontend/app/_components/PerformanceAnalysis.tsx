"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Props {
  teamXG:    Record<string, number>;
  teamGoals: Record<string, number>;
}

type Category = "over" | "under";

const CATEGORY_META: { key: Category; label: string; color: string }[] = [
  { key: "over",  label: "Over xG",  color: "#2E8B57" },
  { key: "under", label: "Under xG", color: "#B5483F" },
];

const XG_COLOR = "#1B4332";

const TOTAL_W  = 360;
const PAD_R    = 12;
const LABEL_W  = 92;
const TRACK_X  = LABEL_W;
const TRACK_W  = TOTAL_W - TRACK_X - PAD_R;

const ROW_H    = 20;
const TEAM_GAP = 16;
const SLOT_H   = ROW_H + TEAM_GAP;
const HEADER_H = 24;

export default function PerformanceAnalysis({ teamXG, teamGoals }: Props) {
  const [category, setCategory] = useState<Category>("over");
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [mounted,  setMounted]  = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMounted(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setMounted(false); const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, [category]);

  const teams = Object.keys(teamXG).filter(t => teamGoals[t] !== undefined);

  if (teams.length === 0) {
    return (
      <div className="card" style={{ padding: "10px 14px 14px", height: "100%" }}>
        <div style={{ fontSize: "1rem", fontWeight: 400, color: "#0e1420" }}>Team Performance</div>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 3 }}>Awaiting first results.</p>
      </div>
    );
  }

  const ranked = teams
    .map(t => ({ team: t, xg: teamXG[t], goals: teamGoals[t], delta: teamGoals[t] - teamXG[t] }))
    .sort((a, b) => b.delta - a.delta);

  const topOver  = ranked.filter(d => d.delta >= 0).slice(0, 4);
  const topUnder = ranked.filter(d => d.delta <  0).slice(-4).reverse();

  const displayEntries = category === "over" ? topOver : topUnder;
  const activeColor = CATEGORY_META.find(c => c.key === category)!.color;

  const allVals  = displayEntries.flatMap(d => [d.xg, d.goals]);
  const rawMax   = allVals.length ? Math.max(...allVals) : 5;
  const maxTick  = Math.ceil(rawMax);
  const domain   = maxTick * 1.1;
  const ticks    = [0, Math.round(maxTick / 2), maxTick];
  const toX      = (v: number) => TRACK_X + (v / domain) * TRACK_W;

  const chartH = HEADER_H + 4 * SLOT_H;

  return (
    <div className="card" style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 400, color: "var(--foreground)" }}>Team Performance</div>

          {/* Legend + toggle buttons in one row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            {/* xG legend dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width={14} height={10} style={{ overflow: "visible" }}>
                <circle cx={3.5} cy={5} r={3.5} fill="var(--card-bg)" stroke={XG_COLOR} strokeWidth={1.5} />
              </svg>
              <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>xG</span>
            </div>
            {/* Goals legend dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: 0, background: activeColor }} />
              <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>Goals</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 12, background: "var(--border)" }} />

            {/* Over / Under toggle chips */}
            {CATEGORY_META.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                style={{
                  fontSize: "0.5625rem",
                  fontWeight: 600,
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: 0,
                  cursor: "pointer",
                  background: category === key ? color : "var(--toggle-track)",
                  color:      category === key ? "#ffffff" : "var(--toggle-inactive)",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Link href="/teams" className="back-link">
          See All ↗
        </Link>
      </div>

      {/* Chart */}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${TOTAL_W} ${chartH}`} style={{ display: "block", overflow: "visible", flex: 1 }}>

        {/* Tick marks */}
        {ticks.map(v => (
          <g key={v}>
            <text x={toX(v)} y={10} textAnchor="middle" fontSize={7} fill="var(--svg-text-faint)" style={{ fontVariantNumeric: "tabular-nums" }}>{v}</text>
            <line x1={toX(v)} y1={HEADER_H} x2={toX(v)} y2={chartH} stroke="var(--border)" strokeWidth={1} />
          </g>
        ))}

        {/* Rows */}
        {displayEntries.map((d, i) => {
          const y       = HEADER_H + i * SLOT_H + ROW_H / 2;
          const xXG     = toX(d.xg);
          const xG      = toX(d.goals);
          const isH     = hovered === d.team;
          const xMin    = Math.min(xXG, xG);
          const xMax    = Math.max(xXG, xG);
          const lineLen = xMax - xMin;
          const delay   = i * 120;

          return (
            <g
              key={d.team}
              onMouseEnter={() => setHovered(d.team)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {/* Track background */}
              <line x1={TRACK_X} x2={TRACK_X + TRACK_W} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1}
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.3s ease ${delay}ms`,
                }}
              />

              {/* Team label slides in from left */}
              <text x={LABEL_W - 5} y={y + 4.5} textAnchor="end" fontSize={13}
                fill={isH ? "var(--foreground)" : "var(--svg-text)"} fontWeight={isH ? 600 : 400}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateX(0)" : "translateX(-12px)",
                  transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
                }}>
                {d.team}
              </text>

              {/* Connector line draws from xG outward */}
              <line
                x1={xMin} x2={xMax} y1={y} y2={y}
                stroke={activeColor} strokeWidth={isH ? 2.5 : 1.5} opacity={0.55}
                strokeDasharray={lineLen}
                strokeDashoffset={mounted ? 0 : lineLen}
                style={{ transition: `stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) ${delay + 200}ms` }}
              />

              {/* xG dot pops in */}
              <circle cx={xXG} cy={y} r={isH ? 5 : 4} fill="#fff" stroke={XG_COLOR} strokeWidth={1.5}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: mounted ? "scale(1)" : "scale(0)",
                  transition: `transform 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay + 350}ms`,
                }}
              />

              {/* Goals dot pops in with slight extra delay */}
              <circle cx={xG} cy={y} r={isH ? 5 : 4} fill={activeColor} opacity={isH ? 1 : 0.85}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: mounted ? "scale(1)" : "scale(0)",
                  transition: `transform 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay + 430}ms`,
                }}
              />

              {isH && (
                <text x={xXG} y={y - 9} textAnchor="middle" fontSize={8} fill={XG_COLOR} fontWeight={400}
                  style={{ fontVariantNumeric: "tabular-nums" }}>
                  {d.xg.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

    </div>
  );
}
