"use client";

import { useState, useMemo } from "react";

interface Row {
  team: string;
  played: number;
  wins: number;
  xg: number;
  goals: number;
  delta: number;
}

type StatusFilter = "all" | "overperforming" | "clinical" | "as_expected" | "underperforming";

function getBadge(delta: number, winRate: number) {
  if (delta > 0.5)                       return { label: "Overperforming",  key: "overperforming",  color: "var(--positive)",    bg: "var(--positive-dim)" };
  if (delta < -0.5 && winRate >= 0.5)    return { label: "Clinical",        key: "clinical",        color: "var(--accent)",      bg: "var(--accent-dim)" };
  if (delta < -0.5)                      return { label: "Underperforming", key: "underperforming", color: "var(--negative)",    bg: "var(--negative-dim)" };
  return                                        { label: "As Expected",      key: "as_expected",     color: "var(--text-muted)", bg: "var(--bg-page)" };
}

function Pagination({ total, page, onChange }: { total: number; page: number; onChange: (p: number) => void }) {
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    minWidth: 26, height: 26, padding: "0 6px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.75rem", fontWeight: 600,
    border: "1px solid var(--border)", borderRadius: 0,
    cursor: "pointer", transition: "all 0.1s", background: "transparent", color: "var(--foreground)",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button style={{ ...btnBase, color: page === 1 ? "var(--text-faint)" : "var(--foreground)", cursor: page === 1 ? "default" : "pointer" }} onClick={() => page > 1 && onChange(page - 1)} disabled={page === 1}>←</button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} style={{ minWidth: 26, textAlign: "center", fontSize: "0.75rem", color: "var(--text-faint)" }}>…</span>
        ) : (
          <button key={p} style={{ ...btnBase, background: page === p ? "var(--accent)" : "transparent", color: page === p ? "#fff" : "var(--foreground)", border: page === p ? "1px solid var(--accent)" : "1px solid var(--border)" }} onClick={() => onChange(p as number)}>{p}</button>
        )
      )}
      <button style={{ ...btnBase, color: page === totalPages ? "var(--text-faint)" : "var(--foreground)", cursor: page === totalPages ? "default" : "pointer" }} onClick={() => page < totalPages && onChange(page + 1)} disabled={page === totalPages}>→</button>
    </div>
  );
}

const PAGE_SIZE = 10;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",            label: "All"            },
  { key: "overperforming", label: "Overperforming" },
  { key: "clinical",       label: "Clinical"       },
  { key: "as_expected",    label: "As Expected"    },
  { key: "underperforming",label: "Underperforming"},
];

export default function TeamsTable({ rows }: { rows: Row[] }) {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const winRate = r.played > 0 ? r.wins / r.played : 0;
      const badge = getBadge(r.delta, winRate);
      const matchesSearch = !q || r.team.toLowerCase().includes(q);
      const matchesStatus = status === "all" || badge.key === status;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  const total     = filtered.length;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleStatus(s: StatusFilter) { setStatus(s); setPage(1); }

  return (
    <div className="card table-wrap">
      {/* Header + controls */}
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "#0e1420" }}>xG vs Goals</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{rows.length} teams</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search team…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              style={{
                paddingLeft: 26, paddingRight: 8, height: 28, width: 150,
                border: "1px solid var(--border)", borderRadius: 0,
                fontSize: "0.75rem", background: "var(--bg-page)", color: "var(--foreground)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", background: "var(--toggle-track)", padding: 2, gap: 1 }}>
            {STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleStatus(key)}
                style={{
                  padding: "3px 9px", fontSize: "0.625rem", fontWeight: 600,
                  border: "none", borderRadius: 0, cursor: "pointer",
                  background: status === key ? "#2E8B57" : "transparent",
                  color:      status === key ? "#ffffff"  : "var(--toggle-inactive)",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No matches played yet.</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                {[["Team", "left"], ["MP", "right"], ["W", "right"], ["xG", "right"], ["Goals", "right"], ["Delta", "right"], ["Status", "right"]].map(([h, align]) => (
                  <th key={h} className="table-header" style={{ textAlign: align as "left" | "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => {
                const winRate = r.played > 0 ? r.wins / r.played : 0;
                const badge = getBadge(r.delta, winRate);
                return (
                  <tr key={r.team} className="table-row">
                    <td className="table-cell" style={{ fontWeight: 500 }}>{r.team}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{r.played}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{r.wins}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{r.xg.toFixed(2)}</td>
                    <td className="table-cell" style={{ textAlign: "right", fontWeight: 600 }}>{r.goals}</td>
                    <td className="table-cell" style={{ textAlign: "right", fontWeight: 700, color: r.delta > 0 ? "var(--positive)" : r.delta < 0 ? "var(--negative)" : "var(--text-faint)" }}>
                      {r.delta > 0 ? "+" : ""}{r.delta.toFixed(2)}
                    </td>
                    <td className="table-cell" style={{ textAlign: "right" }}>
                      <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {total === 0 && (
            <p style={{ padding: "16px 14px", color: "var(--text-faint)", fontSize: "0.8125rem", margin: 0, textAlign: "center" }}>
              No teams found.
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)" }}>
              {total > 0
                ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
                : "0 results"}
            </span>
            <Pagination total={total} page={page} onChange={p => setPage(p)} />
          </div>
        </>
      )}
    </div>
  );
}
