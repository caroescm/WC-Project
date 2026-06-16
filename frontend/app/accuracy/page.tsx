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

function predictedOutcome(p: Prediction): string {
  if (p.HOME_WIN >= p.DRAW && p.HOME_WIN >= p.AWAY_WIN) return "Home Win";
  if (p.AWAY_WIN >= p.DRAW && p.AWAY_WIN >= p.HOME_WIN) return "Away Win";
  return "Draw";
}

function actualOutcome(hs: number, as_: number): string {
  return hs > as_ ? "Home Win" : hs < as_ ? "Away Win" : "Draw";
}

export default async function AccuracyPage() {
  let fixtures: Fixture[] = [];
  try {
    fixtures = await fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json());
  } catch {}

  const played = fixtures
    .filter(f => f.result !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Derive metrics
  let correct = 0, homeWins = 0;
  const drawProbs: number[] = [];

  const rows = played.map(f => {
    const parsed = parseScore(f.result!);
    if (!parsed) return null;
    const [hs, as_] = parsed;
    const pred   = predictedOutcome(f.prediction);
    const actual = actualOutcome(hs, as_);
    const ok     = pred === actual;
    if (ok) correct++;
    if (hs > as_) homeWins++;
    if (actual === "Draw") drawProbs.push(f.prediction.DRAW);
    return { f, pred, actual, ok };
  }).filter(Boolean) as { f: Fixture; pred: string; actual: string; ok: boolean }[];

  const total      = rows.length;
  const accPct     = total ? (correct / total * 100).toFixed(1) : null;
  const basePct    = total ? (homeWins / total * 100).toFixed(1) : null;
  const avgDrawPct = drawProbs.length
    ? (drawProbs.reduce((s, v) => s + v, 0) / drawProbs.length * 100).toFixed(1) : null;

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

      <h1 className="sport" style={{ fontSize:36, color:"var(--foreground)" }}>
        Model Accuracy
      </h1>

      {/* Metric cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[
          { label:"Overall Accuracy",
            big: accPct ? `${accPct}%` : "—",
            sub: total ? `${correct} of ${total} correct` : "No matches played yet" },
          { label:"vs Naive Baseline",
            big: accPct && basePct
              ? `${(+accPct - +basePct) >= 0 ? "+" : ""}${(+accPct - +basePct).toFixed(1)} pts`
              : "—",
            sub: basePct ? `Baseline (home win rate): ${basePct}%` : "No matches played yet",
            color: accPct && basePct && +accPct >= +basePct ? "#4caf50" : "#ef4444" },
          { label:"Avg Draw Prob (real draws)",
            big: avgDrawPct ? `${avgDrawPct}%` : "—",
            sub: drawProbs.length ? `Across ${drawProbs.length} drawn match${drawProbs.length > 1?"es":""}` : "No draws yet" },
        ].map(c => (
          <div key={c.label} className="grad-border" style={{ borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em",
                          textTransform:"uppercase", color:"var(--text-muted)", marginBottom:6 }}>
              {c.label}
            </div>
            <div className="sport" style={{ fontSize:28, color: c.color ?? "var(--foreground)",
                                             lineHeight:1.1, marginBottom:4 }}>
              {c.big}
            </div>
            <div style={{ fontSize:11, color:"var(--text-muted)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
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
                {["Date","Match","Predicted","Actual","Result"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ f, pred, actual, ok }) => (
                <tr key={f.match_number}
                    style={{ background: ok ? "rgba(76,175,80,0.04)" : "rgba(239,68,68,0.04)" }}>
                  <td style={{ ...td, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{f.date}</td>
                  <td style={td}>{f.home_team} vs {f.away_team}</td>
                  <td style={{ ...td, color:"var(--text-muted)" }}>{pred}</td>
                  <td style={{ ...td, color:"var(--text-muted)" }}>{actual}</td>
                  <td style={td}>
                    <span style={{
                      fontSize:14, fontWeight:700,
                      color: ok ? "#4caf50" : "#ef4444",
                    }}>
                      {ok ? "✓" : "✗"}
                    </span>
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
