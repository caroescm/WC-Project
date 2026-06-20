import Link from "next/link";
import { parseScore } from "../_components/dateUtils";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number; }
interface Fixture { match_number: number; date: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction; }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";
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
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null).sort((a,b) => a.date.localeCompare(b.date));
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

  const total = rows.length;
  const accPct = total ? (correct / total * 100).toFixed(1) : null;
  const basePct = total ? (homeWins / total * 100).toFixed(1) : null;
  const avgDrawPct = drawProbs.length ? (drawProbs.reduce((s,v) => s + v, 0) / drawProbs.length * 100).toFixed(1) : null;
  const delta = accPct && basePct ? +accPct - +basePct : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" className="back-link">← Back</Link>

      <h1 className="page-title">Model Accuracy</h1>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {[
          { label:"Overall Accuracy", big: accPct ? `${accPct}%` : "—", sub: total ? `${correct} of ${total} correct` : "No matches played yet" },
          { label:"vs Naive Baseline", big: delta !== null ? `${delta >= 0?"+":""}${delta.toFixed(1)} pts` : "—",
            sub: basePct ? `Home-win baseline: ${basePct}%` : "No matches played yet",
            subColor: delta !== null ? (delta >= 0 ? "var(--positive)" : "var(--negative)") : undefined },
          { label:"Avg Draw Prob", big: avgDrawPct ? `${avgDrawPct}%` : "—", sub: drawProbs.length ? `${drawProbs.length} drawn match${drawProbs.length > 1?"es":""}` : "No draws yet" },
        ].map(m => (
          <div key={m.label} className="card">
            <div className="card-header" style={{ marginBottom:8 }}>
              <span className="card-title">{m.label}</span>
            </div>
            <span className="sport" style={{ fontSize:"1.375rem", color:"var(--foreground)" }}>{m.big}</span>
            {m.sub && <div style={{ fontSize:12, color: (m as any).subColor ?? "var(--text-faint)", marginTop:4 }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">No matches played yet — check back once the tournament begins.</div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>{["Date","Match","Predicted","Actual","Result"].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ f, pred, actual, ok }) => (
                <tr key={f.match_number} className="table-row">
                  <td className="table-cell" style={{ color:"var(--text-faint)", whiteSpace:"nowrap" }}>{f.date}</td>
                  <td className="table-cell">{f.home_team} vs {f.away_team}</td>
                  <td className="table-cell" style={{ color:"var(--text-faint)" }}>{pred}</td>
                  <td className="table-cell" style={{ color:"var(--text-faint)" }}>{actual}</td>
                  <td className="table-cell">
                    <span style={{ fontSize:14, fontWeight:700, color: ok ? "var(--positive)" : "var(--negative)" }}>
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
