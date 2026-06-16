import Link from "next/link";

interface Prediction {
  HOME_WIN: number; DRAW: number; AWAY_WIN: number;
  home_xg: number;  away_xg: number;
}
interface Fixture {
  match_number: number; date: string;
  home_team: string; away_team: string;
  group: string; result: string | null;
  prediction: Prediction;
}

const BASE = "https://wc-project-production.up.railway.app";

function parseScore(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [+m[1], +m[2]] : null;
}

export default async function PerformancePage() {
  let fixtures: Fixture[] = [];
  try {
    fixtures = await fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json());
  } catch {}

  const played = fixtures.filter(f => f.result !== null);

  // Accumulate per-team stats
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

  const th: React.CSSProperties = {
    padding:"9px 14px", fontSize:10, fontWeight:700,
    letterSpacing:"0.14em", textTransform:"uppercase",
    color:"var(--text-muted)", textAlign:"left",
    borderBottom:"1px solid var(--border)",
  };
  const td: React.CSSProperties = {
    padding:"9px 14px", fontSize:12,
    color:"var(--foreground)", borderBottom:"1px solid var(--border)",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" style={{ fontSize:11, color:"var(--text-muted)", textDecoration:"none" }}>
        ← Dashboard
      </Link>

      <div>
        <h1 className="sport" style={{ fontSize:36, color:"var(--foreground)", marginBottom:4 }}>
          xG Performance
        </h1>
        <p style={{ fontSize:12, color:"var(--text-muted)" }}>
          Actual goals vs model expected goals per team
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="grad-border" style={{ borderRadius:14, padding:24,
             textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>
          No matches played yet — check back once the tournament begins.
        </div>
      ) : (
        <div className="grad-border" style={{ borderRadius:16, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Team","Played","xG","Goals","Delta",""].map((h, i) => (
                  <th key={i} style={{ ...th, textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const badge =
                  r.delta >  0.5 ? { label:"Over",     color:"#4caf50", bg:"rgba(76,175,80,0.12)"   } :
                  r.delta < -0.5 ? { label:"Under",    color:"#ef4444", bg:"rgba(239,68,68,0.12)"  } :
                                   { label:"On track",  color:"var(--text-muted)", bg:"rgba(255,255,255,0.05)" };
                return (
                  <tr key={r.team}>
                    <td style={td}>{r.team}</td>
                    <td style={{ ...td, textAlign:"right", color:"var(--text-muted)" }}>{r.played}</td>
                    <td style={{ ...td, textAlign:"right", color:"var(--text-muted)" }}>{r.xg.toFixed(2)}</td>
                    <td style={{ ...td, textAlign:"right" }}>{r.goals}</td>
                    <td style={{ ...td, textAlign:"right",
                                 color: r.delta > 0 ? "#4caf50" : r.delta < 0 ? "#ef4444" : "var(--text-muted)",
                                 fontWeight:600 }}>
                      {r.delta > 0 ? "+" : ""}{r.delta.toFixed(2)}
                    </td>
                    <td style={{ ...td, textAlign:"right" }}>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6,
                                     background:badge.bg, color:badge.color, fontWeight:600 }}>
                        {badge.label}
                      </span>
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
