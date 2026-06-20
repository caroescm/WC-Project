"use client";

import { useState } from "react";

interface StandingRow {
  team: string;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

interface GroupData {
  group: string;
  rows: StandingRow[];
}

const COLS_VISIBLE = 3;

function GroupTable({ group, rows }: GroupData) {
  return (
    <div className="card" style={{ overflow: "hidden", minWidth: 0 }}>
      <div style={{ padding: "12px 16px", background: "#1a1628", borderRadius: 0 }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.04em" }}>{group}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Team", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((h, i) => (
              <th key={h} style={{
                padding: "8px 10px", fontSize: "0.5625rem", fontWeight: 700,
                color: "var(--text-faint)", textAlign: i === 0 ? "left" : "center",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const qualifies = i < 2;
            return (
              <tr key={r.team} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "9px 10px", fontSize: "0.8125rem", fontWeight: qualifies ? 600 : 400, color: qualifies ? "var(--foreground)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  {qualifies && <span style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 0, flexShrink: 0 }} />}
                  {r.team}
                </td>
                {[r.played, r.w, r.d, r.l, r.gf, r.ga, r.gd > 0 ? `+${r.gd}` : r.gd].map((v, j) => (
                  <td key={j} style={{ padding: "9px 10px", fontSize: "0.8125rem", textAlign: "center", color: j === 6 ? (r.gd > 0 ? "var(--positive)" : r.gd < 0 ? "var(--negative)" : "var(--text-faint)") : "var(--text-faint)", fontVariantNumeric: "tabular-nums" }}>
                    {v}
                  </td>
                ))}
                <td style={{ padding: "9px 10px", fontSize: "0.875rem", fontWeight: 700, textAlign: "center", color: qualifies ? "var(--accent)" : "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function GroupCarousel({ groups }: { groups: GroupData[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(groups.length / COLS_VISIBLE);
  const visible = groups.slice(page * COLS_VISIBLE, page * COLS_VISIBLE + COLS_VISIBLE);

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 28, height: 28,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid var(--border)", borderRadius: 0, background: "transparent",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "var(--text-faint)" : "var(--foreground)",
    fontSize: "0.875rem", transition: "all 0.1s",
  });

  return (
    <div>
      {/* Header with arrows */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
          Group Standings
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)" }}>
            {page * COLS_VISIBLE + 1}–{Math.min(page * COLS_VISIBLE + COLS_VISIBLE, groups.length)} of {groups.length}
          </span>
          <button style={btnStyle(page === 0)} onClick={() => page > 0 && setPage(p => p - 1)} disabled={page === 0}>←</button>
          <button style={btnStyle(page === totalPages - 1)} onClick={() => page < totalPages - 1 && setPage(p => p + 1)} disabled={page === totalPages - 1}>→</button>
        </div>
      </div>

      {/* 3-column grid of current page */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {visible.map(g => (
          <GroupTable key={g.group} group={g.group} rows={g.rows} />
        ))}
      </div>
    </div>
  );
}
