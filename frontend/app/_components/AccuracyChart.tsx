"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Stage = "all" | "group" | "r32" | "r16" | "r8plus";

export interface MatchEntry {
  ok: boolean;
  home: string;
  away: string;
  match_number: number;
}

const STAGE_TABS: { key: Stage; label: string }[] = [
  { key: "all",    label: "All"         },
  { key: "group",  label: "Group Stage" },
  { key: "r32",    label: "Round of 32" },
  { key: "r16",    label: "Round of 16" },
  { key: "r8plus", label: "Round of 8+" },
];

function getStage(mn: number): Stage {
  if (mn <= 72) return "group";
  if (mn <= 88) return "r32";
  if (mn <= 96) return "r16";
  return "r8plus";
}

const CHART_H = 170;
const W       = 500;
const PAD     = { t: 14, r: 12, b: 28, l: 40 };

export default function AccuracyChart({ matchLog }: { matchLog: MatchEntry[] }) {
  const [stage,   setStage]   = useState<Stage>("all");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; acc: number; ok: boolean; home: string; away: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => { setMounted(false); const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, [stage]);

  const filtered = stage === "all"
    ? matchLog
    : matchLog.filter(m => getStage(m.match_number) === stage);

  const cW = W - PAD.l - PAD.r;
  const cH = CHART_H - PAD.t - PAD.b;
  const n  = filtered.length;

  let runCorrect = 0;
  const pts = filtered.map(({ ok, home, away }, i) => {
    if (ok) runCorrect++;
    const acc = runCorrect / (i + 1);
    const x   = PAD.l + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW);
    const y   = PAD.t + (1 - acc) * cH;
    return { x, y, ok, acc, home, away };
  });

  const finalAcc = pts.length ? pts[pts.length - 1].acc : null;
  const correct  = filtered.filter(m => m.ok).length;

  const areaPath = n > 1
    ? `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
      pts.slice(1).map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L ${(PAD.l + cW).toFixed(1)},${(PAD.t + cH).toFixed(1)} L ${PAD.l.toFixed(1)},${(PAD.t + cH).toFixed(1)} Z`
    : "";

  const refs = [
    { pct: 1.0, label: "100%" },
    { pct: 0.5, label: "50%"  },
    { pct: 0.0, label: "0%"   },
  ];

  return (
    <div className="card" style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--foreground)" }}>Model Accuracy</span>
          </div>
          {finalAcc !== null && (
            <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: 2, display: "block" }}>
              {correct} of {n} correct{stage !== "all" ? ` · ${STAGE_TABS.find(t => t.key === stage)?.label}` : ""}
            </span>
          )}
        </div>
        <Link href="/results" className="back-link">
          See All ↗
        </Link>
      </div>

      {/* ── Chart ── */}
      {n === 0 ? (
        <div style={{ height: CHART_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>
            {matchLog.length === 0 ? "Awaiting first results." : "No matches yet in this stage."}
          </span>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {finalAcc !== null && (
            <div style={{ position: "absolute", top: 0, right: 0, textAlign: "right", pointerEvents: "none", zIndex: 1 }}>
              <span className="num-lg" style={{ fontSize: "1.4rem", fontWeight: 400, color: "var(--accent)", lineHeight: 1, opacity: 0.18 }}>
                {(finalAcc * 100).toFixed(0)}%
              </span>
            </div>
          )}
          <svg viewBox={`0 0 ${W} ${CHART_H}`} style={{ width: "100%", height: CHART_H, display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="acc-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1B4332" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1B4332" stopOpacity="0"    />
              </linearGradient>
              <clipPath id="line-reveal">
                <rect x={PAD.l} y={0} height={CHART_H + PAD.t}
                  width={mounted ? cW : 0}
                  style={{ transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </clipPath>
            </defs>

            {/* Gridlines */}
            {refs.map(({ pct, label }) => {
              const y = PAD.t + (1 - pct) * cH;
              return (
                <g key={label}>
                  <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y}
                    stroke="var(--border)" strokeWidth="1"
                    strokeDasharray={pct === 0.5 ? "4 4" : undefined} />
                  <text x={PAD.l - 6} y={y + 8} textAnchor="end"
                    style={{ fontSize: 9, fill: "var(--svg-text-faint)", fontFamily: "inherit" }}>
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Area fill + line — revealed left-to-right */}
            <g clipPath="url(#line-reveal)">
              {n > 1 && <path d={areaPath} fill="url(#acc-area)" />}
              {n > 1 && (
                <polyline
                  points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </g>

            {/* Invisible hover targets — one per point */}
            {pts.map((p, i) => {
              const prevX = i > 0 ? (pts[i - 1].x + p.x) / 2 : PAD.l;
              const nextX = i < pts.length - 1 ? (p.x + pts[i + 1].x) / 2 : PAD.l + cW;
              return (
                <rect
                  key={i}
                  x={prevX} y={PAD.t}
                  width={nextX - prevX} height={cH}
                  fill="transparent"
                  onMouseEnter={() => setTooltip({ x: p.x, y: p.y, acc: p.acc, ok: p.ok, home: p.home, away: p.away })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "crosshair" }}
                />
              );
            })}

            {/* Hover indicator dot — only shown on hover */}
            {tooltip && (
              <circle
                cx={tooltip.x.toFixed(1)} cy={tooltip.y.toFixed(1)} r="4.5"
                fill={tooltip.ok ? "var(--positive)" : "var(--negative)"}
                stroke="#ffffff" strokeWidth="2"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* X-axis match labels */}
            <text x={PAD.l} y={CHART_H - 8} textAnchor="middle"
              style={{ fontSize: 8, fill: "var(--text-faint)" }}>1</text>
            {n > 1 && (
              <text x={PAD.l + cW} y={CHART_H - 8} textAnchor="middle"
                style={{ fontSize: 8, fill: "var(--text-faint)" }}>{n}</text>
            )}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: "absolute",
              top: `calc(${(tooltip.y / CHART_H) * 100}% - 60px)`,
              left: `calc(${(tooltip.x / W) * 100}%)`,
              transform: "translateX(-50%)",
              background: "#10241A",
              color: "#ffffff",
              borderRadius: 0,
              padding: "8px 12px",
              fontSize: "0.6875rem",
              pointerEvents: "none",
              zIndex: 10,
              whiteSpace: "nowrap",
            }}>
              <div className="num" style={{ fontWeight: 400, marginBottom: 2 }}>
                {(tooltip.acc * 100).toFixed(1)}% accuracy
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.625rem" }}>
                {tooltip.home} vs {tooltip.away}
              </div>
              <div style={{ color: tooltip.ok ? "#6EE7A0" : "#F87171", fontSize: "0.625rem", marginTop: 1 }}>
                {tooltip.ok ? "Correct" : "Wrong"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stage filter tabs ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {STAGE_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setStage(key)} style={{
            padding: "4px 12px",
            fontSize: "0.625rem",
            fontWeight: 600,
            border: "none",
            borderRadius: 0,
            cursor: "pointer",
            background: stage === key ? "#2E8B57" : "var(--toggle-track)",
            color:      stage === key ? "#ffffff"  : "var(--toggle-inactive)",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
