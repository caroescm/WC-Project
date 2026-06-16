import Link from "next/link";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number; }
interface Fixture { match_number: number; date: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction; }

const BASE = "https://wc-project-production.up.railway.app";

function parseScore(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [+m[1], +m[2]] : null;
}

export default async function PerformancePage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null);
  const stats: Record<string, { played:number; xg:number; goals:number }> = {};

  for (const f of played) {
    const parsed = parseScore(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    for (const [team, goals, xg] of [
      [f.home_team, hs,  f.prediction.home_xg],
      [f.away_team, as_, f.prediction.away_xg],
    ] as [string, number, number][]) {
      if (!stats[team]) stats[team] = { played:0, xg:0, goals:0 };
      stats[team].played++;
      stats[team].xg    += xg;
      stats[team].goals += goals;
    }
  }

  const rows = Object.entries(stats)
    .map(([team, s]) => ({ team, ...s, delta: s.goals - s.xg }))
    .sort((a, b) => b.delta - a.delta);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" className="back-link">← Back</Link>

      <div>
        <h1 className="page-title">xG Performance</h1>
        <p className="page-subtitle">Actual goals vs model expected goals per team</p>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No matches played yet — check back once the tournament begins.</div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                {[["Team","left"],["Played","right"],["xG","right"],["Goals","right"],["Delta","right"],["","right"]].map(([h, align]) => (
                  <th key={h} className="table-header" style={{ textAlign: align as "left"|"right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const badge =
                  r.delta >  0.5 ? { label:"Over",     color:"var(--positive)", bg:"var(--positive-dim)" } :
                  r.delta < -0.5 ? { label:"Under",    color:"var(--negative)", bg:"var(--negative-dim)" } :
                                   { label:"On track",  color:"var(--text-muted)", bg:"var(--bg-page)" };
                return (
                  <tr key={r.team} className="table-row">
                    <td className="table-cell">{r.team}</td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{r.played}</td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{r.xg.toFixed(2)}</td>
                    <td className="table-cell" style={{ textAlign:"right" }}>{r.goals}</td>
                    <td className="table-cell" style={{ textAlign:"right", color: r.delta > 0 ? "var(--positive)" : r.delta < 0 ? "var(--negative)" : "var(--text-faint)", fontWeight:600 }}>
                      {r.delta > 0 ? "+" : ""}{r.delta.toFixed(2)}
                    </td>
                    <td className="table-cell" style={{ textAlign:"right" }}>
                      <span className="badge" style={{ background:badge.bg, color:badge.color }}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
