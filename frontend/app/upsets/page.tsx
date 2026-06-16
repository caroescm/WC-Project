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
const WIN_UPSET_THRESHOLD  = 0.40;
const DRAW_UPSET_THRESHOLD = 0.25;

function parseScore(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [+m[1], +m[2]] : null;
}

export default async function UpsetsPage() {
  let fixtures: Fixture[] = [];
  try {
    fixtures = await fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json());
  } catch {}

  const played = fixtures.filter(f => f.result !== null);

  type UpsetRow = {
    match: string; result: string; type: "Win upset" | "Draw upset";
    odds: string; magnitude: number;
  };

  const upsets: UpsetRow[] = [];

  for (const f of played) {
    const parsed = parseScore(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN } = f.prediction;
    const match = `${f.home_team} vs ${f.away_team}`;

    if (hs > as_ && HOME_WIN < WIN_UPSET_THRESHOLD) {
      upsets.push({ match, result: f.result!, type:"Win upset",
        odds:`${f.home_team} won at ${(HOME_WIN*100).toFixed(1)}%`,
        magnitude: 1 - HOME_WIN });
    } else if (as_ > hs && AWAY_WIN < WIN_UPSET_THRESHOLD) {
      upsets.push({ match, result: f.result!, type:"Win upset",
        odds:`${f.away_team} won at ${(AWAY_WIN*100).toFixed(1)}%`,
        magnitude: 1 - AWAY_WIN });
    } else if (hs === as_ && DRAW < DRAW_UPSET_THRESHOLD) {
      upsets.push({ match, result: f.result!, type:"Draw upset",
        odds:`Drew at ${(DRAW*100).toFixed(1)}%`,
        magnitude: 1 - DRAW });
    }
  }

  upsets.sort((a, b) => b.magnitude - a.magnitude);

  const th: React.CSSProperties = {
    padding:"9px 14px", fontSize:10, fontWeight:700,
    letterSpacing:"0.14em", textTransform:"uppercase",
    color:"var(--text-muted)", textAlign:"left",
    borderBottom:"1px solid var(--border)",
  };
  const td: React.CSSProperties = {
    padding:"9px 14px", fontSize:12,
    color:"var(--foreground)", borderBottom:"1px solid var(--border)",
    verticalAlign:"middle",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" style={{ fontSize:11, color:"var(--text-muted)", textDecoration:"none" }}>
        ← Dashboard
      </Link>

      <div>
        <h1 className="sport" style={{ fontSize:36, color:"var(--foreground)", marginBottom:4 }}>
          Upset Tracker
        </h1>
        <p style={{ fontSize:12, color:"var(--text-muted)" }}>
          Matches where the lower-probability team won or drew
        </p>
      </div>

      {upsets.length === 0 ? (
        <div className="grad-border" style={{ borderRadius:14, padding:32,
             textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>
          {played.length === 0
            ? "No matches played yet — check back once the tournament begins."
            : "No upsets so far — the favourites are holding up."}
        </div>
      ) : (
        <div className="grad-border" style={{ borderRadius:16, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Match","Result","Type","Odds","Magnitude"].map((h, i) => (
                  <th key={h} style={{ ...th, textAlign: i === 4 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upsets.map((u, i) => (
                <tr key={i} style={{ background:"rgba(239,68,68,0.03)" }}>
                  <td style={td}>{u.match}</td>
                  <td style={{ ...td, color:"var(--text-muted)", fontFamily:"monospace" }}>{u.result}</td>
                  <td style={td}>
                    <span style={{
                      fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:600,
                      background: u.type === "Win upset"
                        ? "rgba(239,68,68,0.12)" : "rgba(251,146,60,0.12)",
                      color: u.type === "Win upset" ? "#ef4444" : "#fb923c",
                    }}>
                      {u.type}
                    </span>
                  </td>
                  <td style={{ ...td, color:"var(--text-muted)" }}>{u.odds}</td>
                  <td style={{ ...td, textAlign:"right" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                      <div style={{ width:80, height:5, borderRadius:3,
                                    background:"rgba(255,255,255,0.06)" }}>
                        <div style={{ height:"100%", borderRadius:3, background:"#ef4444",
                                      width:`${u.magnitude * 100}%` }} />
                      </div>
                      <span style={{ fontSize:11, color:"#ef4444", fontWeight:600, width:36,
                                     textAlign:"right" }}>
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
