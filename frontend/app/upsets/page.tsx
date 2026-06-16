import Link from "next/link";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number; }
interface Fixture { match_number: number; date: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction; }

const BASE = "https://wc-project-production.up.railway.app";
const WIN_UPSET_THRESHOLD  = 0.40;
const DRAW_UPSET_THRESHOLD = 0.25;

function parseScore(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [+m[1], +m[2]] : null;
}

export default async function UpsetsPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null);
  const upsets: { match: string; result: string; type: "Win upset" | "Draw upset"; odds: string; magnitude: number }[] = [];

  for (const f of played) {
    const parsed = parseScore(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN } = f.prediction;
    const match = `${f.home_team} vs ${f.away_team}`;
    if (hs > as_ && HOME_WIN < WIN_UPSET_THRESHOLD) {
      upsets.push({ match, result:f.result!, type:"Win upset", odds:`${f.home_team} won at ${(HOME_WIN*100).toFixed(1)}%`, magnitude: 1 - HOME_WIN });
    } else if (as_ > hs && AWAY_WIN < WIN_UPSET_THRESHOLD) {
      upsets.push({ match, result:f.result!, type:"Win upset", odds:`${f.away_team} won at ${(AWAY_WIN*100).toFixed(1)}%`, magnitude: 1 - AWAY_WIN });
    } else if (hs === as_ && DRAW < DRAW_UPSET_THRESHOLD) {
      upsets.push({ match, result:f.result!, type:"Draw upset", odds:`Drew at ${(DRAW*100).toFixed(1)}%`, magnitude: 1 - DRAW });
    }
  }

  upsets.sort((a, b) => b.magnitude - a.magnitude);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" className="back-link">← Back</Link>

      <div>
        <h1 className="page-title">Upset Tracker</h1>
        <p className="page-subtitle">Matches where the lower-probability team won or drew</p>
      </div>

      {upsets.length === 0 ? (
        <div className="empty">
          {played.length === 0
            ? "No matches played yet — check back once the tournament begins."
            : "No upsets so far — the favourites are holding up."}
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                {["Match","Result","Type","Odds","Magnitude"].map((h, i) => (
                  <th key={h} className="table-header" style={{ textAlign: i === 4 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upsets.map((u, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell">{u.match}</td>
                  <td className="table-cell" style={{ color:"var(--text-faint)", fontFamily:"monospace" }}>{u.result}</td>
                  <td className="table-cell">
                    <span className="badge" style={{
                      background: u.type === "Win upset" ? "var(--negative-dim)" : "var(--accent-light)",
                      color: u.type === "Win upset" ? "var(--negative)" : "var(--accent)",
                    }}>
                      {u.type === "Win upset" ? "Upset" : "Draw"}
                    </span>
                  </td>
                  <td className="table-cell" style={{ color:"var(--text-faint)" }}>{u.odds}</td>
                  <td className="table-cell" style={{ textAlign:"right" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                      <div className="bar-track" style={{ width:80 }}>
                        <div className="bar-fill" style={{ background:"var(--negative)", width:`${u.magnitude * 100}%` }} />
                      </div>
                      <span style={{ fontSize:11, color:"var(--negative)", fontWeight:600, width:36, textAlign:"right" }}>
                        {(u.magnitude * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
