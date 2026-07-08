"use client";

import { useState, useMemo } from "react";
import { AnimatedBar } from "../_components/AnimatedBar";
import { parseMatchDateUTC } from "../_components/dateUtils";

type SimEntry = { r32: number; r16: number; qf: number; sf: number; final: number; winner: number };
type Simulation = Record<string, SimEntry>;

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_elo: number; away_elo: number; home_xg?: number; away_xg?: number }
interface Fixture { match_number: number; date: string; location: string; home_team: string; away_team: string; group: string; result: string | null; penalties: string | null; prediction: Prediction }

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const PAGE_SIZE = 10;

type RoundFilter = "all" | "winner" | "final" | "sf" | "qf" | "r16" | "r32";

const ROUND_TABS: { key: RoundFilter; label: string }[] = [
  { key: "all",    label: "All"           },
  { key: "winner", label: "Winner"        },
  { key: "final",  label: "Final"         },
  { key: "sf",     label: "Semifinal"     },
  { key: "qf",     label: "Quarter-Final" },
  { key: "r16",    label: "Round of 16"   },
  { key: "r32",    label: "Round of 32"   },
];

function getRoundVal(p: SimEntry, r: RoundFilter): number {
  if (r === "all" || r === "winner") return p.winner;
  if (r === "final")  return p.final;
  if (r === "sf")     return p.sf;
  if (r === "qf")     return p.qf;
  if (r === "r16")    return p.r16;
  return p.r32;
}

// ── Pagination ──────────────────────────────────────────────────────────────

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
    minWidth: 28, height: 28, padding: "0 6px",
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
          <span key={`ellipsis-${i}`} style={{ minWidth: 28, textAlign: "center", fontSize: "0.75rem", color: "var(--text-faint)" }}>…</span>
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
          >
            {p}
          </button>
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

// ── Tab 1: Simulation Table ──────────────────────────────────────────────────

function SimulationTab({ simulation }: { simulation: Simulation }) {
  const [search, setSearch]       = useState("");
  const [round, setRound]         = useState<RoundFilter>("all");
  const [page, setPage]           = useState(1);

  const ranked = useMemo(() => {
    const sortKey = round === "all" ? "winner" : round;
    return Object.entries(simulation)
      .sort(([, a], [, b]) => getRoundVal(b, sortKey as RoundFilter) - getRoundVal(a, sortKey as RoundFilter));
  }, [simulation, round]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ranked.filter(([team]) => team.toLowerCase().includes(q)) : ranked;
  }, [ranked, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleRound(r: RoundFilter) { setRound(r); setPage(1); }

  const maxWinner = ranked[0]?.[1].winner ?? 1;

  const COLS = [
    { key: "winner", label: "Winner" },
    { key: "final",  label: "Final"  },
    { key: "sf",     label: "Semi"   },
    { key: "qf",     label: "QF"     },
    { key: "r16",    label: "R16"    },
    { key: "r32",    label: "R32"    },
  ] as const;

  if (ranked.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Simulation data unavailable.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>

        {/* Search */}
        <div style={{ position: "relative", minWidth: 160, maxWidth: 280 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search team…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 30, paddingRight: 10, height: 32,
              border: "1px solid var(--border)", borderRadius: 0,
              fontSize: "0.8125rem", background: "var(--bg-page)", color: "var(--foreground)",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Round filter tabs */}
        <div style={{ display: "flex", background: "var(--toggle-track)", padding: 3, gap: 2, flexWrap: "wrap" }}>
          {ROUND_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleRound(key)}
              style={{
                padding: "4px 10px", fontSize: "0.625rem", fontWeight: 600,
                border: "none", borderRadius: 0, cursor: "pointer",
                background: round === key ? "#2E8B57" : "transparent",
                color:      round === key ? "#ffffff"  : "var(--toggle-inactive)",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card table-wrap" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="table-header" style={{ textAlign: "left",  width: 36 }}>#</th>
              <th className="table-header" style={{ textAlign: "left"  }}>Team</th>
              {COLS.map(c => (
                <th
                  key={c.key}
                  className="table-header"
                  style={{
                    textAlign: "right", cursor: "pointer",
                    color: round === c.key ? "var(--accent)" : undefined,
                    userSelect: "none",
                  }}
                  onClick={() => handleRound(c.key)}
                >
                  {c.label}
                  {round === c.key && <span style={{ marginLeft: 3 }}>↓</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(([team, p], i) => {
              const globalRank = (page - 1) * PAGE_SIZE + i;
              const top3 = globalRank < 3;
              const activeVal = getRoundVal(p, round);

              return (
                <tr key={team} className="table-row">
                  <td className="table-cell" style={{ color: "var(--text-faint)", width: 36 }}>{globalRank + 1}</td>
                  <td className="table-cell" style={{ fontWeight: top3 ? 700 : 500, color: top3 ? "var(--accent)" : "var(--foreground)" }}>
                    {team}
                  </td>
                  <td className="table-cell" style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <div className="bar-track" style={{ width: 48, flexShrink: 0 }}>
                        <div className="bar-fill" style={{
                          background: top3 ? "var(--accent)" : "var(--border)",
                          width: `${(p.winner / maxWinner) * 100}%`,
                        }} />
                      </div>
                      <span style={{
                        fontWeight: 600, width: 42, textAlign: "right",
                        color: round === "winner" || round === "all"
                          ? (top3 ? "var(--accent)" : "var(--text-faint)")
                          : "var(--text-faint)",
                      }}>{pct(p.winner)}</span>
                    </div>
                  </td>
                  {(["final", "sf", "qf", "r16", "r32"] as const).map(col => (
                    <td key={col} className="table-cell" style={{
                      textAlign: "right",
                      color: round === col ? "var(--accent)" : "var(--text-faint)",
                      fontWeight: round === col ? 600 : 400,
                    }}>
                      {pct(p[col])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p style={{ padding: "16px 14px", color: "var(--text-faint)", fontSize: "0.8125rem", margin: 0 }}>
            No teams match &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* Footer: count left, pagination right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)" }}>
          {filtered.length > 0
            ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} teams · 3,000 Monte Carlo rounds`
            : "0 results"
          }
        </span>
        <Pagination total={filtered.length} page={page} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>
    </div>
  );
}

// ── Tab 2: Match Predictions ─────────────────────────────────────────────────

function isUpsetAlert(f: Fixture): boolean {
  if (!f.prediction) return false;
  const { home_elo, away_elo, HOME_WIN, AWAY_WIN } = f.prediction;
  if (Math.abs(home_elo - away_elo) < 80) return false;
  return (home_elo > away_elo ? AWAY_WIN : HOME_WIN) >= 0.28;
}

function formatDate(dateStr: string) {
  const d = parseMatchDateUTC(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MatchRow({ fixture }: { fixture: Fixture }) {
  const upset = isUpsetAlert(fixture);
  const h = Math.round(fixture.prediction.HOME_WIN * 100);
  const dr = Math.round(fixture.prediction.DRAW * 100);
  const a = Math.round(fixture.prediction.AWAY_WIN * 100);
  const dominant = h >= a && h >= dr ? "home" : a >= h && a >= dr ? "away" : "draw";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "90px 1fr 260px 1fr 140px",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Group + upset */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="badge badge-accent" style={{ width: "fit-content" }}>{fixture.group}</span>
        {upset && <span className="badge" style={{ background: "var(--risk-dim)", color: "var(--risk)", width: "fit-content" }}>Upset</span>}
      </div>

      {/* Home team */}
      <div style={{ textAlign: "right" }}>
        <span style={{
          fontSize: "0.9375rem", fontWeight: 600,
          color: dominant === "home" ? "var(--accent)" : "var(--foreground)",
        }}>{fixture.home_team}</span>
        <div style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: 2 }}>ELO {fixture.prediction.home_elo}</div>
      </div>

      {/* Probability display */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", fontWeight: 600 }}>
          <span style={{ color: dominant === "home" ? "var(--accent)" : "var(--text-faint)" }}>{h}%</span>
          <span style={{ color: "var(--text-faint)" }}>{dr}%</span>
          <span style={{ color: dominant === "away" ? "var(--accent)" : "var(--text-faint)" }}>{a}%</span>
        </div>
        <AnimatedBar
          homeWin={fixture.prediction.HOME_WIN}
          draw={fixture.prediction.DRAW}
          awayWin={fixture.prediction.AWAY_WIN}
          homeTeam={fixture.home_team}
          awayTeam={fixture.away_team}
          compact
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5625rem", color: "var(--text-faint)" }}>
          <span>W</span><span>D</span><span>L</span>
        </div>
      </div>

      {/* Away team */}
      <div>
        <span style={{
          fontSize: "0.9375rem", fontWeight: 600,
          color: dominant === "away" ? "var(--accent)" : "var(--foreground)",
        }}>{fixture.away_team}</span>
        <div style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: 2 }}>ELO {fixture.prediction.away_elo}</div>
      </div>

      {/* Date + location */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatDate(fixture.date)}</div>
        <div style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: 2 }}>{fixture.location}</div>
      </div>
    </div>
  );
}

function MatchPredictionsTab({ fixtures }: { fixtures: Fixture[] }) {
  const [search, setSearch]       = useState("");
  const [activeGroup, setGroup]   = useState<string>("All");

  const upcoming = useMemo(() => fixtures.filter(f => f.result === null), [fixtures]);

  const groups = useMemo(() => {
    const gs = [...new Set(upcoming.map(f => f.group))]
      .filter(g => g.startsWith("Group "))
      .sort((a, b) => a.replace("Group ", "").localeCompare(b.replace("Group ", "")));
    return ["All", "Knockout", ...gs];
  }, [upcoming]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list =
      activeGroup === "All"      ? upcoming :
      activeGroup === "Knockout" ? upcoming.filter(f => !f.group.startsWith("Group ")) :
                                   upcoming.filter(f => f.group === activeGroup);
    if (q) list = list.filter(f => f.home_team.toLowerCase().includes(q) || f.away_team.toLowerCase().includes(q));
    return list;
  }, [upcoming, activeGroup, search]);

  function handleSearch(v: string) { setSearch(v); }
  function handleGroup(g: string) { setGroup(g); setSearch(""); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>

        {/* Search */}
        <div style={{ position: "relative", minWidth: 160, maxWidth: 280 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search team…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 30, paddingRight: 10, height: 32,
              border: "1px solid var(--border)", borderRadius: 0,
              fontSize: "0.8125rem", background: "var(--bg-page)", color: "var(--foreground)",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Group filter tabs */}
        <div style={{ display: "flex", background: "var(--toggle-track)", padding: 3, gap: 2, flexWrap: "wrap" }}>
          {groups.map(g => {
            const label = g === "All" || g === "Knockout" ? g : g.replace("Group ", "");
            return (
              <button
                key={g}
                onClick={() => handleGroup(g)}
                style={{
                  padding: "4px 10px", fontSize: "0.625rem", fontWeight: 600,
                  border: "none", borderRadius: 0, cursor: "pointer",
                  background: activeGroup === g ? "#2E8B57" : "transparent",
                  color:      activeGroup === g ? "#ffffff"  : "var(--toggle-inactive)",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        {/* Column header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "90px 1fr 260px 1fr 140px",
          gap: 12, padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-page)",
        }}>
          {["Group", "Home", "Probability", "Away", "When"].map((h, i) => (
            <span key={h} className="table-header" style={{
              textAlign: i === 1 ? "right" : i >= 3 ? (i === 4 ? "right" : "left") : "left",
              display: "block",
            }}>{h}</span>
          ))}
        </div>

        {filtered.map(f => <MatchRow key={f.match_number} fixture={f} />)}

        {filtered.length === 0 && (
          <p style={{ padding: "24px 14px", color: "var(--text-faint)", fontSize: "0.8125rem", margin: 0, textAlign: "center" }}>
            {search ? `No matches found for "${search}"` : "No upcoming matches."}
          </p>
        )}
      </div>

      <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)" }}>
        {filtered.length} match{filtered.length !== 1 ? "es" : ""} · predictions based on ELO ratings &amp; historical data
      </span>
    </div>
  );
}

// ── Tab 3: Tournament Bracket ────────────────────────────────────────────────

const R32_MATCHES = [
  { matchNum: 73, date: "Jun 28", home: "2nd A",   away: "2nd B"         },
  { matchNum: 74, date: "Jun 29", home: "1st E",   away: "3rd A/B/C/D/F" },
  { matchNum: 75, date: "Jun 30", home: "1st F",   away: "2nd C"         },
  { matchNum: 76, date: "Jun 29", home: "1st C",   away: "2nd F"         },
  { matchNum: 77, date: "Jun 30", home: "1st I",   away: "3rd C/D/F/G/H" },
  { matchNum: 78, date: "Jun 30", home: "2nd E",   away: "2nd I"         },
  { matchNum: 79, date: "Jul 1",  home: "1st A",   away: "3rd C/E/F/H/I" },
  { matchNum: 80, date: "Jul 1",  home: "1st L",   away: "3rd E/H/I/J/K" },
  { matchNum: 81, date: "Jul 2",  home: "1st D",   away: "3rd B/E/F/I/J" },
  { matchNum: 82, date: "Jul 1",  home: "1st G",   away: "3rd A/E/H/I/J" },
  { matchNum: 83, date: "Jul 2",  home: "2nd K",   away: "2nd L"         },
  { matchNum: 84, date: "Jul 2",  home: "1st H",   away: "2nd J"         },
  { matchNum: 85, date: "Jul 3",  home: "1st B",   away: "3rd E/F/G/I/J" },
  { matchNum: 86, date: "Jul 3",  home: "1st J",   away: "2nd H"         },
  { matchNum: 87, date: "Jul 4",  home: "1st K",   away: "3rd D/E/I/J/L" },
  { matchNum: 88, date: "Jul 3",  home: "2nd D",   away: "2nd G"         },
];

const R16_MATCHES = [
  { matchNum: 89, date: "Jul 4", home: "TBD", away: "TBD" },
  { matchNum: 90, date: "Jul 4", home: "TBD", away: "TBD" },
  { matchNum: 91, date: "Jul 5", home: "TBD", away: "TBD" },
  { matchNum: 92, date: "Jul 6", home: "TBD", away: "TBD" },
  { matchNum: 93, date: "Jul 6", home: "TBD", away: "TBD" },
  { matchNum: 94, date: "Jul 7", home: "TBD", away: "TBD" },
  { matchNum: 95, date: "Jul 7", home: "TBD", away: "TBD" },
  { matchNum: 96, date: "Jul 7", home: "TBD", away: "TBD" },
];

const QF_MATCHES = [
  { matchNum: 97,  date: "Jul 9",  home: "TBD", away: "TBD" },
  { matchNum: 98,  date: "Jul 10", home: "TBD", away: "TBD" },
  { matchNum: 99,  date: "Jul 11", home: "TBD", away: "TBD" },
  { matchNum: 100, date: "Jul 12", home: "TBD", away: "TBD" },
];

const SF_MATCHES = [
  { matchNum: 101, date: "Jul 14", home: "TBD", away: "TBD" },
  { matchNum: 102, date: "Jul 15", home: "TBD", away: "TBD" },
];

const FINAL_MATCHES = [
  { matchNum: 104, date: "Jul 19", home: "TBD", away: "TBD" },
];

type BracketRound = "r32" | "r16" | "qf" | "sf" | "final";

const BRACKET_ROUNDS: { key: BracketRound; label: string; short: string; dates: string; slots: number; simKey: keyof SimEntry; cols: number }[] = [
  { key: "r32",   label: "Round of 32",    short: "R32",  dates: "Jun 28 – Jul 4", slots: 16, simKey: "r32",   cols: 4 },
  { key: "r16",   label: "Round of 16",    short: "R16",  dates: "Jul 4 – 6",      slots: 8,  simKey: "r16",   cols: 4 },
  { key: "qf",    label: "Quarter-Finals", short: "QF",   dates: "Jul 9 – 11",     slots: 4,  simKey: "qf",    cols: 4 },
  { key: "sf",    label: "Semi-Finals",    short: "SF",   dates: "Jul 14 – 15",    slots: 2,  simKey: "sf",    cols: 2 },
  { key: "final", label: "Final",          short: "Final",dates: "Jul 19",          slots: 1,  simKey: "final", cols: 1 },
];

const MEDAL_COLORS: Record<number, { color: string; bg: string; border: string }> = {
  0: { color: "#92701A", bg: "rgba(201,152,26,0.08)", border: "rgba(201,152,26,0.35)" },
  1: { color: "#5A6B70", bg: "rgba(140,160,165,0.08)", border: "rgba(140,160,165,0.35)" },
  2: { color: "#7A4E2D", bg: "rgba(180,100,60,0.08)", border: "rgba(180,100,60,0.35)" },
};

function BracketTab({ simulation, fixtures }: { simulation: Simulation; fixtures: Fixture[] }) {
  const [activeRound, setActiveRound] = useState<BracketRound>("r32");

  // Live knockout matchups keyed by match number (overrides the static slot codes once teams are drawn)
  const fixtureByNum = useMemo(
    () => Object.fromEntries(fixtures.map(f => [f.match_number, f])),
    [fixtures]
  );

  const topFor = (key: keyof SimEntry, n: number) =>
    [...Object.entries(simulation)]
      .sort(([, a], [, b]) => b[key] - a[key])
      .slice(0, n);

  const winner = useMemo(
    () => [...Object.entries(simulation)].sort(([, a], [, b]) => b.winner - a.winner)[0],
    [simulation]
  );

  if (!Object.keys(simulation).length) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Simulation data unavailable.</p>;
  }

  const round = BRACKET_ROUNDS.find(r => r.key === activeRound)!;
  const roundIndex = BRACKET_ROUNDS.findIndex(r => r.key === activeRound);

  // ── Match card (known matchups — real teams once drawn/played) ──
  const KnownMatchCard = ({ matchNum, date, home, away, result, penalties }: { matchNum: number; date: string; home: string; away: string; result?: string | null; penalties?: string | null }) => {
    const scoreLabel = result ? (penalties ? `${result.replace(/\s/g, "")} (${penalties.replace(/\s/g, "")}p)` : result) : "VS";
    return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--border)",
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minWidth: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.06em",
          background: "var(--accent-light)", color: "var(--accent)",
          padding: "2px 6px",
        }}>M{matchNum}</span>
        <span style={{ fontSize: "0.5625rem", color: "var(--text-faint)", fontWeight: 500 }}>{date}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground)",
          textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{home}</span>
        <span style={{
          fontSize: result ? "0.6875rem" : "0.5625rem", fontWeight: 800,
          color: result ? "var(--accent)" : "var(--text-faint)",
          border: "1px solid var(--border)", padding: "2px 5px", flexShrink: 0,
          letterSpacing: "0.04em", whiteSpace: "nowrap",
        }}>{scoreLabel}</span>
        <span style={{
          fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{away}</span>
      </div>
    </div>
    );
  };

  // ── Favorites grid ──
  const FavoritesGrid = ({ simKey, n }: { simKey: keyof SimEntry; n: number }) => {
    const top = topFor(simKey, n);
    const maxVal = top[0]?.[1][simKey] ?? 1;
    return (
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", background: "var(--toggle-track)",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Simulation Favorites
          </span>
          <span style={{ fontSize: "0.5625rem", color: "var(--text-faint)" }}>
            · who reaches this round in 3,000 Monte Carlo runs
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {top.map(([team, p], i) => {
            const medal = MEDAL_COLORS[i];
            return (
              <div key={team} style={{
                padding: "12px 14px",
                borderRight: (i + 1) % 4 !== 0 ? "1px solid var(--border)" : undefined,
                borderBottom: i < top.length - 4 ? "1px solid var(--border)" : undefined,
                background: medal ? medal.bg : "var(--card-bg)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{
                  fontSize: "0.75rem", fontWeight: 800,
                  color: medal ? medal.color : "var(--text-faint)",
                  width: 18, flexShrink: 0, paddingTop: 1,
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.875rem",
                    fontWeight: i < 3 ? 700 : 500,
                    color: medal ? medal.color : "var(--foreground)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    marginBottom: 6,
                  }}>{team}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="bar-track" style={{ flex: 1, height: 3 }}>
                      <div className="bar-fill" style={{
                        width: `${(p[simKey] / maxVal) * 100}%`,
                        background: medal ? medal.color : "var(--border)",
                        height: "100%",
                      }} />
                    </div>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: 600,
                      color: medal ? medal.color : "var(--text-faint)",
                      flexShrink: 0, width: 36, textAlign: "right",
                    }}>
                      {(p[simKey] * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const favN = activeRound === "sf" ? 4 : activeRound === "final" ? 4 : 8;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Round header + filter ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>
            {round.label}
          </h2>
          <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{round.dates}</span>
          {activeRound === "r32" && (
            <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)" }}>
              · Slots assigned by group stage finish
            </span>
          )}
        </div>
        <div style={{ display: "flex", background: "var(--toggle-track)", padding: 3, gap: 2, flexShrink: 0 }}>
          {BRACKET_ROUNDS.map(r => {
            const active = r.key === activeRound;
            return (
              <button
                key={r.key}
                onClick={() => setActiveRound(r.key)}
                style={{
                  padding: "4px 10px", fontSize: "0.625rem", fontWeight: 600,
                  border: "none", borderRadius: 0, cursor: "pointer",
                  background: active ? "#2E8B57" : "transparent",
                  color: active ? "#ffffff" : "var(--toggle-inactive)",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                {r.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Match grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${round.cols}, 1fr)`,
        gap: 6,
        ...(activeRound === "final" ? { maxWidth: 320 } : {}),
      }}>
        {(activeRound === "r32" ? R32_MATCHES
          : activeRound === "r16" ? R16_MATCHES
          : activeRound === "qf"  ? QF_MATCHES
          : activeRound === "sf"  ? SF_MATCHES
          : FINAL_MATCHES
        ).map(m => {
          const f = fixtureByNum[m.matchNum];
          return (
            <KnownMatchCard
              key={m.matchNum}
              matchNum={m.matchNum}
              date={f?.date ?? m.date}
              home={f?.home_team ?? m.home}
              away={f?.away_team ?? m.away}
              result={f?.result}
              penalties={f?.penalties}
            />
          );
        })}
      </div>

      {/* ── Simulation favorites ── */}
      <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
        <FavoritesGrid simKey={round.simKey} n={favN} />
      </div>

      {/* ── Predicted champion (Final tab only) ── */}
      {activeRound === "final" && winner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 18px",
          background: "var(--accent-dim)",
          border: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
            Predicted Champion
          </span>
          <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--accent)" }}>{winner[0]}</span>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {(winner[1].winner * 100).toFixed(1)}% chance to win the tournament
          </span>
        </div>
      )}

      <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)" }}>
        Bracket structure based on official 2026 FIFA WC draw · 3,000 Monte Carlo simulations
      </span>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export function PredictionsClient({ simulation, fixtures }: { simulation: Simulation; fixtures: Fixture[] }) {
  const [tab, setTab] = useState<"simulation" | "matches" | "bracket">("simulation");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "0.875rem",
    fontWeight: 600,
    border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    background: "transparent",
    color: active ? "var(--accent)" : "var(--text-faint)",
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
        <button style={tabStyle(tab === "simulation")} onClick={() => setTab("simulation")}>
          Tournament Odds
        </button>
        <button style={tabStyle(tab === "matches")} onClick={() => setTab("matches")}>
          Match Predictions
        </button>
        <button style={tabStyle(tab === "bracket")} onClick={() => setTab("bracket")}>
          Bracket
        </button>
      </div>

      {tab === "simulation" ? <SimulationTab simulation={simulation} />
        : tab === "matches" ? <MatchPredictionsTab fixtures={fixtures} />
        : <BracketTab simulation={simulation} fixtures={fixtures} />
      }
    </div>
  );
}
