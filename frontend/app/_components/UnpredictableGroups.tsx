"use client";

import { useState, useEffect } from "react";


interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number }
interface Fixture { group: string; prediction: Prediction }

type Bucket = "certain" | "moderate" | "uncertain";

function classify(p: Prediction): Bucket {
  const max = Math.max(p.HOME_WIN, p.DRAW, p.AWAY_WIN);
  if (max > 0.55) return "certain";
  if (max > 0.45) return "moderate";
  return "uncertain";
}

const BUCKET_META: { key: Bucket; label: string; color: string }[] = [
  { key: "certain",   label: "Clear Favorite", color: "#1B4332" },
  { key: "moderate",  label: "Moderate",       color: "#A8C3B0" },
  { key: "uncertain", label: "Toss-Up",        color: "#B5483F" },
];

const TAG_COLOR = (score: number) =>
  score > 0.3 ? { bg: "#F3E3DF", text: "#B5483F" }
  : score > 0.1 ? { bg: "#FEF5DC", text: "#9B6E00" }
  : { bg: "#D4EDE0", text: "#2E8B57" };

const TAG_LABEL = (score: number) =>
  score > 0.3 ? "Very Unpredictable"
  : score > 0.1 ? "Moderate"
  : "Predictable";

export default function UnpredictableGroups({ fixtures }: { fixtures: Fixture[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const groupFixtures = fixtures.filter(f => f.group && f.prediction);

  const groupMap: Record<string, Record<Bucket, number> & { total: number }> = {};
  for (const f of groupFixtures) {
    const g = f.group;
    if (!groupMap[g]) groupMap[g] = { certain: 0, moderate: 0, uncertain: 0, total: 0 };
    groupMap[g][classify(f.prediction)]++;
    groupMap[g].total++;
  }

  const groups = Object.entries(groupMap)
    .map(([g, d]) => ({
      group:  g,
      letter: g.replace("Group ", ""),
      ...d,
      score:  d.uncertain / d.total,
    }))
    .sort((a, b) => b.score - a.score);

  if (groups.length === 0) {
    return (
      <div className="card" style={{ padding: "10px 14px 14px" }}>
        <div style={{ fontSize: "1rem", fontWeight: 400, color: "#0e1420" }}>Group Predictability</div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: 8 }}>Awaiting fixture data.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--foreground)" }}>Group Predictability</span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {groups.slice(0, 8).map((g, i) => {
          const tag = TAG_COLOR(g.score);
          return (
            <div key={g.group} style={{
              display: "flex", alignItems: "center", gap: 8,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-8px)",
              transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`,
            }}>

              {/* Group letter */}
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)", width: 16, flexShrink: 0 }}>
                {g.letter}
              </span>

              {/* Stacked bar */}
              <div style={{ flex: 1, display: "flex", height: 8, borderRadius: 0, overflow: "hidden" }}>
                {BUCKET_META.map(({ key, color }) => {
                  const pct = (g[key] / g.total) * 100;
                  if (pct === 0) return null;
                  return (
                    <div key={key} style={{ width: mounted ? `${pct}%` : "0%", background: color, transition: `width 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 80 + 150}ms` }}
                      title={`${g[key]} ${key} match${g[key] !== 1 ? "es" : ""}`}
                    />
                  );
                })}
              </div>

              {/* Tag */}
              <span style={{
                fontSize: "0.5625rem", fontWeight: 700,
                background: tag.bg, color: tag.text,
                borderRadius: 0, padding: "2px 7px",
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {TAG_LABEL(g.score)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, paddingTop: 12, marginTop: "auto", borderTop: "1px solid var(--border)" }}>
        {BUCKET_META.map(({ key, label, color }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 0, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.5625rem", color: "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
