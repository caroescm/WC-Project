"use client";

import { useState, useEffect } from "react";

interface Prediction {
  HOME_WIN: number; DRAW: number; AWAY_WIN: number;
  home_xg: number; away_xg: number;
}
interface Fixture {
  match_number: number; date: string;
  home_team: string; away_team: string;
  group: string; result: string | null;
  prediction: Prediction;
}

const PAGE_SIZE = 3;
const INTERVAL  = 10_000;

function parseResult(result: string): [number, number] | null {
  const m = result.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

function predictionOutcome(p: Prediction): "HOME_WIN" | "DRAW" | "AWAY_WIN" {
  if (p.HOME_WIN >= p.DRAW && p.HOME_WIN >= p.AWAY_WIN) return "HOME_WIN";
  if (p.AWAY_WIN >= p.DRAW && p.AWAY_WIN >= p.HOME_WIN) return "AWAY_WIN";
  return "DRAW";
}

function actualOutcome(hs: number, as_: number): "HOME_WIN" | "DRAW" | "AWAY_WIN" {
  return hs > as_ ? "HOME_WIN" : as_ > hs ? "AWAY_WIN" : "DRAW";
}

/* ── Upcoming row ── */
function UpcomingRow({ f, index, last }: { f: Fixture; index: number; last: boolean }) {
  const maxP = Math.max(f.prediction.HOME_WIN, f.prediction.DRAW, f.prediction.AWAY_WIN);
  const h = (f.prediction.HOME_WIN * 100).toFixed(0);
  const d = (f.prediction.DRAW     * 100).toFixed(0);
  const a = (f.prediction.AWAY_WIN * 100).toFixed(0);
  const group = (f.group || "KO").replace("Group ", "");
  return (
    <div style={{ padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ fontSize: "0.5625rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>
        Group {group} · Match {index + 1} of 3
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {f.home_team}
        </span>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)", flexShrink: 0 }}>vs</span>
        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {f.away_team}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
        <span style={{ flex: 1, fontSize: "0.6875rem", fontWeight: f.prediction.HOME_WIN === maxP ? 700 : 400, color: f.prediction.HOME_WIN === maxP ? "var(--accent)" : "var(--text-faint)" }}>
          {h}%
        </span>
        <span style={{ fontSize: "0.6875rem", fontWeight: f.prediction.DRAW === maxP ? 700 : 400, color: f.prediction.DRAW === maxP ? "var(--accent)" : "var(--text-faint)", flexShrink: 0 }}>
          Draw {d}%
        </span>
        <span style={{ flex: 1, fontSize: "0.6875rem", fontWeight: f.prediction.AWAY_WIN === maxP ? 700 : 400, color: f.prediction.AWAY_WIN === maxP ? "var(--accent)" : "var(--text-faint)", textAlign: "right" }}>
          {a}%
        </span>
      </div>
    </div>
  );
}

/* ── Archive row ── */
function ArchiveRow({ f, index, last }: { f: Fixture; index: number; last: boolean }) {
  const parsed  = f.result ? parseResult(f.result) : null;
  const correct = parsed
    ? actualOutcome(parsed[0], parsed[1]) === predictionOutcome(f.prediction)
    : null;
  const h = (f.prediction.HOME_WIN * 100).toFixed(0);
  const d = (f.prediction.DRAW     * 100).toFixed(0);
  const a = (f.prediction.AWAY_WIN * 100).toFixed(0);
  const maxP = Math.max(f.prediction.HOME_WIN, f.prediction.DRAW, f.prediction.AWAY_WIN);
  const group = (f.group || "KO").replace("Group ", "");
  return (
    <div style={{ padding: "8px 0", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Group {group} · Match {index + 1} of 3
        </span>
        {correct !== null && (
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: correct ? "var(--positive)" : "var(--negative)" }}>
            {correct ? "✓ Correct" : "✗ Wrong"}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {f.home_team}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {f.result ?? "—"}
        </span>
        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {f.away_team}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
        <span style={{ flex: 1, fontSize: "0.6875rem", fontWeight: f.prediction.HOME_WIN === maxP ? 700 : 400, color: f.prediction.HOME_WIN === maxP ? "var(--accent)" : "var(--text-faint)" }}>
          {h}%
        </span>
        <span style={{ fontSize: "0.6875rem", fontWeight: f.prediction.DRAW === maxP ? 700 : 400, color: f.prediction.DRAW === maxP ? "var(--accent)" : "var(--text-faint)", flexShrink: 0 }}>
          Draw {d}%
        </span>
        <span style={{ flex: 1, fontSize: "0.6875rem", fontWeight: f.prediction.AWAY_WIN === maxP ? 700 : 400, color: f.prediction.AWAY_WIN === maxP ? "var(--accent)" : "var(--text-faint)", textAlign: "right" }}>
          {a}%
        </span>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function MatchRotator({
  upcoming,
  played,
}: {
  upcoming: Fixture[];
  played:   Fixture[];
}) {
  const [page,   setPage]   = useState(0);
  const [visible, setVisible] = useState(true);

  const recentPlayed = [...played].reverse();

  const upTotal  = Math.min(3, Math.ceil(upcoming.length    / PAGE_SIZE) || 1);
  const plTotal  = Math.min(3, Math.ceil(recentPlayed.length / PAGE_SIZE) || 1);
  const totalPages = Math.max(upTotal, plTotal);

  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPage(p => (p + 1) % totalPages);
        setVisible(true);
      }, 300);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [totalPages]);

  const upSlice  = upcoming.slice((page % upTotal) * PAGE_SIZE, ((page % upTotal) + 1) * PAGE_SIZE);
  const plSlice  = recentPlayed.slice((page % plTotal) * PAGE_SIZE, ((page % plTotal) + 1) * PAGE_SIZE);

  const dotCount = totalPages;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      {/* ── Upcoming panel ── */}
      <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Upcoming
          </span>
          <Dots total={dotCount} active={page % upTotal} />
        </div>
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}>
          {upSlice.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)", margin: 0 }}>No upcoming fixtures.</p>
          ) : upSlice.map((f, i) => (
            <UpcomingRow key={f.match_number} f={f} index={i} last={i === upSlice.length - 1} />
          ))}
        </div>
      </div>

      {/* ── Archive panel ── */}
      <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Results
          </span>
          <Dots total={dotCount} active={page % plTotal} />
        </div>
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}>
          {plSlice.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)", margin: 0 }}>No results yet.</p>
          ) : plSlice.map((f, i) => (
            <ArchiveRow key={f.match_number} f={f} index={i} last={i === plSlice.length - 1} />
          ))}
        </div>
      </div>

    </div>
  );
}

function Dots({ total, active }: { total: number; active: number }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === active ? 14 : 5,
          height: 5,
          borderRadius: 0,
          background: i === active ? "var(--accent)" : "var(--border)",
          transition: "width 0.3s ease, background 0.3s ease",
        }} />
      ))}
    </div>
  );
}
