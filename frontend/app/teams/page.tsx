import PerformanceAnalysis from "../_components/PerformanceAnalysis";
import { parseScore } from "../_components/dateUtils";
import TournamentBadge from "../_components/TournamentBadge";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number }
interface Fixture { match_number: number; date: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";

export default async function TeamsPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null);

  const teamXG:    Record<string, number> = {};
  const teamGoals: Record<string, number> = {};
  const teamPlayed: Record<string, number> = {};

  for (const f of played) {
    const parsed = parseScore(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    for (const [team, goals, xg] of [
      [f.home_team, hs,  f.prediction.home_xg],
      [f.away_team, as_, f.prediction.away_xg],
    ] as [string, number, number][]) {
      teamXG[team]     = (teamXG[team]     ?? 0) + xg;
      teamGoals[team]  = (teamGoals[team]  ?? 0) + goals;
      teamPlayed[team] = (teamPlayed[team] ?? 0) + 1;
    }
  }

  const rows = Object.keys(teamXG)
    .map(t => ({ team: t, played: teamPlayed[t], xg: teamXG[t], goals: teamGoals[t], delta: teamGoals[t] - teamXG[t] }))
    .sort((a, b) => b.delta - a.delta);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          Teams
        </h1>
        <TournamentBadge />
      </div>

      {/* Dumbbell chart */}
      <PerformanceAnalysis teamXG={teamXG} teamGoals={teamGoals} />

      {/* Full stats table */}
      <div className="card table-wrap">
        <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "#0e1420" }}>xG vs Goals — All Teams</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty">No matches played yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                {[["Team", "left"], ["MP", "right"], ["xG", "right"], ["Goals", "right"], ["Delta", "right"], ["Status", "right"]].map(([h, align]) => (
                  <th key={h} className="table-header" style={{ textAlign: align as "left" | "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const badge =
                  r.delta >  0.5 ? { label: "Overperforming",  color: "var(--positive)", bg: "var(--positive-dim)" } :
                  r.delta < -0.5 ? { label: "Underperforming", color: "var(--negative)", bg: "var(--negative-dim)" } :
                                   { label: "As Expected",      color: "var(--text-muted)", bg: "var(--bg-page)" };
                return (
                  <tr key={r.team} className="table-row">
                    <td className="table-cell" style={{ fontWeight: 500 }}>{r.team}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{r.played}</td>
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
        )}
      </div>
    </div>
  );
}
