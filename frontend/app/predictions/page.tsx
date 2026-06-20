import TournamentOutlook from "../_components/TournamentOutlook";
import { UpcomingClient } from "../upcoming/UpcomingClient";

type SimEntry = { r32: number; r16: number; qf: number; sf: number; final: number; winner: number };
type Simulation = Record<string, SimEntry>;

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_elo: number; away_elo: number; home_xg: number; away_xg: number }
interface Fixture { match_number: number; date: string; location: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default async function PredictionsPage() {
  let fixtures: Fixture[] = [];
  let simulation: Simulation = {};

  try {
    [fixtures, simulation] = await Promise.all([
      fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()),
      fetch(`${BASE}/simulate`, { next: { revalidate: 3600 } }).then(r => r.json()),
    ]);
  } catch {}

  const ranked    = Object.entries(simulation).sort(([, a], [, b]) => b.winner - a.winner);
  const maxWinner = ranked[0]?.[1].winner ?? 1;
  const upcoming  = fixtures.filter(f => f.result === null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Page header */}
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
        Predictions
      </h1>

      {/* Monte Carlo chart — top 15 teams */}
      <TournamentOutlook simulation={simulation} maxTeams={15} />

      {/* Full simulation table */}
      {ranked.length > 0 && (
        <div className="card table-wrap">
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "#0e1420" }}>Full Simulation Table</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginLeft: 10 }}>3,000 Monte Carlo rounds</span>
          </div>
          <table>
            <thead>
              <tr>
                {(["#", "Team", "Winner", "Final", "Semi", "QF", "R16", "R32"] as const).map((h, i) => (
                  <th key={h} className="table-header" style={{ textAlign: i < 2 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map(([team, p], i) => {
                const top3 = i < 3;
                return (
                  <tr key={team} className="table-row">
                    <td className="table-cell" style={{ color: "var(--text-faint)", width: 32 }}>{i + 1}</td>
                    <td className="table-cell" style={{ fontWeight: top3 ? 700 : 500, color: top3 ? "var(--accent)" : "var(--foreground)" }}>{team}</td>
                    <td className="table-cell" style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <div className="bar-track" style={{ width: 64, flexShrink: 0 }}>
                          <div className="bar-fill" style={{ background: top3 ? "var(--accent)" : "var(--border)", width: `${(p.winner / maxWinner) * 100}%` }} />
                        </div>
                        <span style={{ fontWeight: 600, color: top3 ? "var(--accent)" : "var(--text-faint)", width: 40, textAlign: "right" }}>{pct(p.winner)}</span>
                      </div>
                    </td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{pct(p.final)}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{pct(p.sf)}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{pct(p.qf)}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{pct(p.r16)}</td>
                    <td className="table-cell" style={{ textAlign: "right", color: "var(--text-faint)" }}>{pct(p.r32)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upcoming matches */}
      <div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Upcoming Matches — {upcoming.length} remaining
          </span>
        </div>
        <UpcomingClient fixtures={fixtures} />
      </div>
    </div>
  );
}
