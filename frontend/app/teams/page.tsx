import TeamsTable from "./TeamsTable";
import { parseScore } from "../_components/dateUtils";
import { Fixture, BASE } from "../_components/types";

export default async function TeamsPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null);

  const teamXG:    Record<string, number> = {};
  const teamGoals: Record<string, number> = {};
  const teamPlayed: Record<string, number> = {};
  const teamWins:  Record<string, number> = {};

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
      teamWins[team]   = teamWins[team]   ?? 0;
    }
    if (hs > as_) teamWins[f.home_team] = (teamWins[f.home_team] ?? 0) + 1;
    else if (as_ > hs) teamWins[f.away_team] = (teamWins[f.away_team] ?? 0) + 1;
  }

  const rows = Object.keys(teamXG)
    .map(t => ({ team: t, played: teamPlayed[t], wins: teamWins[t] ?? 0, xg: teamXG[t], goals: teamGoals[t], delta: teamGoals[t] - teamXG[t] }))
    .sort((a, b) => b.delta - a.delta);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
        Teams
      </h1>
      <TeamsTable rows={rows} />
    </div>
  );
}
