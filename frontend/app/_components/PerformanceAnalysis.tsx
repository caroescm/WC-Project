"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Props {
  teamXG:    Record<string, number>;
  teamGoals: Record<string, number>;
}

const OVER_COLOR  = "#3730a3";
const UNDER_COLOR = "#6366f1";
const XG_COLOR    = "#6366f1";

// Layout constants
const TOTAL_W  = 400;
const PAD_R    = 12;
const LABEL_W  = 60;   // team name column
const TRACK_X  = LABEL_W;
const TRACK_W  = TOTAL_W - TRACK_X - PAD_R;

const ROW_H    = 14;   // height per team row
const TEAM_GAP = 8;    // gap between teams
const SLOT_H   = ROW_H + TEAM_GAP;

const HEADER_H = 20;   // tick row
const SEP_H    = 16;   // separator between over/under sections

export default function PerformanceAnalysis({ teamXG, teamGoals }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -180px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const teams = Object.keys(teamXG).filter(t => teamGoals[t] !== undefined);

  if (teams.length === 0) {
    return (
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0e1420" }}>Performance Analysis</div>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 3 }}>Awaiting first results.</p>
      </div>
    );
  }

  const ranked = teams
    .map(t => ({ team: t, xg: teamXG[t], goals: teamGoals[t], delta: teamGoals[t] - teamXG[t] }))
    .sort((a, b) => b.delta - a.delta);

  const topOver  = ranked.filter(d => d.delta >= 0).slice(0, 3);
  const topUnder = ranked.filter(d => d.delta <  0).slice(-3).reverse();

  const allVals = [...topOver, ...topUnder].flatMap(d => [d.xg, d.goals]);
  const rawMax  = Math.max(...allVals);
  const maxTick = Math.ceil(rawMax);
  const domain  = maxTick * 1.1;

  const toX = (v: number) => TRACK_X + (v / domain) * TRACK_W;

  const ticks = [0, Math.round(maxTick / 2), maxTick];

  const overH  = topOver.length  > 0 ? topOver.length  * SLOT_H - TEAM_GAP : 0;
  const underH = topUnder.length > 0 ? topUnder.length * SLOT_H - TEAM_GAP : 0;
  const totalH = HEADER_H + overH + SEP_H + underH + 4;

  const renderRows = (entries: typeof topOver, baseY: number, color: string, startIdx: number) =>
    entries.map((d, i) => {
      const y      = baseY + i * SLOT_H + ROW_H / 2;
      const xXG    = toX(d.xg);
      const xG     = toX(d.goals);
      const isH    = hovered === d.team;
      const xMin   = Math.min(xXG, xG);
      const xMax   = Math.max(xXG, xG);
      const delay  = (startIdx + i) * 70;

      return (
        <g
          key={d.team}
          onMouseEnter={() => setHovered(d.team)}
          onMouseLeave={() => setHovered(null)}
          style={{
            cursor: "default",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateX(0)" : "translateX(-10px)",
            transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
          }}
        >
          {/* Track line */}
          <line x1={TRACK_X} x2={TRACK_X + TRACK_W} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />

          {/* Dumbbell connector */}
          <line x1={xMin} x2={xMax} y1={y} y2={y} stroke={color} strokeWidth={isH ? 2 : 1.5} opacity={0.5} />

          {/* Team name */}
          <text
            x={LABEL_W - 5} y={y + 3.5}
            textAnchor="end" fontSize={7.5}
            fill={isH ? "#0e1420" : "#374151"}
            fontWeight={isH ? 600 : 400}
          >
            {d.team}
          </text>

          {/* xG dot (open circle) */}
          <circle cx={xXG} cy={y} r={isH ? 4.5 : 3.5} fill="#fff" stroke={XG_COLOR} strokeWidth={1.5} />

          {/* Goals dot (filled) */}
          <circle cx={xG} cy={y} r={isH ? 4.5 : 3.5} fill={color} opacity={isH ? 1 : 0.85} />

          {/* xG value above xG dot on hover */}
          {isH && (
            <text x={xXG} y={y - 7} textAnchor="middle" fontSize={7.5} fill={XG_COLOR} fontWeight={700}>
              {d.xg.toFixed(1)}
            </text>
          )}
        </g>
      );
    });

  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0e1420" }}>Performance Analysis</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Performance evolution and expectations</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width={14} height={10} style={{ overflow: "visible" }}>
                  <circle cx={3.5} cy={5} r={3.5} fill="#fff" stroke={XG_COLOR} strokeWidth={1.5} />
                </svg>
                <span style={{ fontSize: "0.625rem", color: "#374151" }}>xG</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: OVER_COLOR }} />
                <span style={{ fontSize: "0.625rem", color: "#374151" }}>Goals</span>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/performance"
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#3730a3",
            textDecoration: "none",
            whiteSpace: "nowrap",
            padding: "5px 16px",
            border: "1.5px solid #3730a3",
            borderRadius: 20,
          }}
        >
          Full Report →
        </Link>
      </div>

      {/* Chart */}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${TOTAL_W} ${totalH}`} style={{ display: "block", overflow: "visible" }}>

        {/* Tick marks */}
        {ticks.map(v => (
          <g key={v}>
            <text x={toX(v)} y={10} textAnchor="middle" fontSize={7} fill="#9ca3af">{v}</text>
            <line x1={toX(v)} y1={HEADER_H} x2={toX(v)} y2={totalH} stroke="#f3f4f6" strokeWidth={1} />
          </g>
        ))}

        {/* OVER label — right-aligned */}
        <text x={TOTAL_W - PAD_R} y={HEADER_H + 8} textAnchor="end" fontSize={7} fontWeight={700} fill={OVER_COLOR} letterSpacing={0.5}>
          OVER xG
        </text>

        {/* Over rows */}
        {renderRows(topOver, HEADER_H + 10, OVER_COLOR, 0)}

        {/* Separator */}
        {(() => {
          const sepY = HEADER_H + 10 + overH + SEP_H / 2;
          return (
            <g>
              <line x1={0} x2={TOTAL_W} y1={sepY} y2={sepY} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3 3" />
              <text x={TOTAL_W - PAD_R} y={sepY + 9} textAnchor="end" fontSize={7} fontWeight={700} fill={UNDER_COLOR} letterSpacing={0.5}>
                UNDER xG
              </text>
            </g>
          );
        })()}

        {/* Under rows */}
        {renderRows(topUnder, HEADER_H + 10 + overH + SEP_H, UNDER_COLOR, topOver.length)}
      </svg>

    </div>
  );
}
