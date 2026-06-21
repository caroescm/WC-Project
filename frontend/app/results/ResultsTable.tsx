"use client";

import { useState, useMemo } from "react";

interface Row {
  matchNumber: number;
  home: string;
  away: string;
  hs: number;
  as_: number;
  h: number;
  d: number;
  a: number;
  pred: string;
  actual: string;
  ok: boolean;
  group: string;
}

function stageLabel(group: string) {
  return group.startsWith("Group ") ? "Group" : "Knockout";
}

const PAGE_SIZE = 8;

type ResultFilter = "all" | "correct" | "missed";
type StageFilter  = "all" | "group" | "knockout";

function MiniBar({ h, d, a }: { h: number; d: number; a: number }) {
  return (
    <div style={{ display: "flex", height: 4, borderRadius: 0, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${h}%`, background: "var(--positive)" }} />
      <div style={{ width: `${d}%`, background: "var(--gold)" }} />
      <div style={{ width: `${a}%`, background: "var(--negative)" }} />
    </div>
  );
}

function Pagination({ total, page, onChange }: { total: number; page: number; onChange: (p: number) => void }) {
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
      <button
        style={{ ...btnBase, color: page === 1 ? "var(--text-faint)" : "var(--foreground)", cursor: page === 1 ? "default" : "pointer" }}
        onClick={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
      >←</button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ minWidth: 26, textAlign: "center", fontSize: "0.75rem", color: "var(--text-faint)" }}>…</span>
        ) : (
          <button
            key={p}
            style={{
              ...btnBase,
              background: page === p ? "var(--accent)" : "transparent",
              color: page === p ? "#fff" : "var(--foreground)",
              border: page === p ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
            onClick={() => onChange(p as number)}
          >{p}</button>
        )
      )}
      <button
        style={{ ...btnBase, color: page === totalPages ? "var(--text-faint)" : "var(--foreground)", cursor: page === totalPages ? "default" : "pointer" }}
        onClick={() => page < totalPages && onChange(page + 1)}
        disabled={page === totalPages}
      >→</button>
    </div>
  );
}

export default function ResultsTable({ rows }: { rows: Row[] }) {
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<ResultFilter>("all");
  const [stage, setStage]         = useState<StageFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchesSearch = !q || r.home.toLowerCase().includes(q) || r.away.toLowerCase().includes(q);
      const matchesResult = filter === "all" || (filter === "correct" ? r.ok : !r.ok);
      const matchesStage  = stage === "all" || (stage === "group" ? r.group.startsWith("Group ") : !r.group.startsWith("Group "));
      return matchesSearch && matchesResult && matchesStage;
    });
  }, [rows, search, filter, stage]);

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleFilter(f: ResultFilter) { setFilter(f); setPage(1); }
  function handleStage(s: StageFilter)   { setStage(s);  setPage(1); }

  const RESULT_FILTERS: { key: ResultFilter; label: string }[] = [
    { key: "all",     label: "All"     },
    { key: "correct", label: "Correct" },
    { key: "missed",  label: "Missed"  },
  ];

  const STAGE_FILTERS: { key: StageFilter; label: string }[] = [
    { key: "all",      label: "All"      },
    { key: "group",    label: "Group"    },
    { key: "knockout", label: "Knockout" },
  ];

  return (
    <div className="card table-wrap">
      {/* Header + controls */}
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--foreground)" }}>Predictions</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{rows.length} matches</span>
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
              placeholder="Search country…"
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

          {/* Stage filter */}
          <div style={{ display: "flex", background: "var(--toggle-track)", padding: 2, gap: 1 }}>
            {STAGE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleStage(key)}
                style={{
                  padding: "3px 9px", fontSize: "0.625rem", fontWeight: 600,
                  border: "none", borderRadius: 0, cursor: "pointer",
                  background: stage === key ? "var(--positive)" : "transparent",
                  color:      stage === key ? "#ffffff"  : "var(--toggle-inactive)",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Result filter */}
          <div style={{ display: "flex", background: "var(--toggle-track)", padding: 2, gap: 1 }}>
            {RESULT_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFilter(key)}
                style={{
                  padding: "3px 9px", fontSize: "0.625rem", fontWeight: 600,
                  border: "none", borderRadius: 0, cursor: "pointer",
                  background: filter === key ? "var(--positive)" : "transparent",
                  color:      filter === key ? "#ffffff"  : "var(--toggle-inactive)",
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
                {["Stage", "Match", "Score", "Probabilities", "Predicted", "Actual"].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(({ matchNumber, home, away, hs, as_, h, d, a, pred, actual, ok, group }) => (
                <tr key={matchNumber} className="table-row">
                  <td className="table-cell">
                    <span className="badge badge-accent" style={{ whiteSpace: "nowrap" }}>{stageLabel(group)}</span>
                  </td>
                  <td className="table-cell" style={{ fontWeight: 500, fontSize: "0.8125rem" }}>
                    {home} <span style={{ color: "var(--text-faint)" }}>vs</span> {away}
                  </td>
                  <td className="table-cell" style={{ fontSize: "0.8125rem" }}>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{hs} – {as_}</span>
                  </td>
                  <td className="table-cell" style={{ minWidth: 100 }}>
                    <MiniBar h={h} d={d} a={a} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5625rem", color: "var(--text-faint)", marginTop: 2 }}>
                      <span>{h}%</span><span>{d}%</span><span>{a}%</span>
                    </div>
                  </td>
                  <td className="table-cell" style={{ color: "var(--text-faint)", fontSize: "0.75rem" }}>{pred}</td>
                  <td className="table-cell" style={{ fontSize: "0.75rem", fontWeight: 600, color: ok ? "var(--positive)" : "var(--negative)" }}>
                    {actual}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total === 0 && (
            <p style={{ padding: "16px 14px", color: "var(--text-faint)", fontSize: "0.8125rem", margin: 0, textAlign: "center" }}>
              No matches found.
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
