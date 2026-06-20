import { parseScore, predictedOutcome } from "../_components/dateUtils";
import ResultsTable from "./ResultsTable";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number }
interface Fixture { match_number: number; date: string; location: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";

export default async function ResultsPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null);

  let correct = 0, homeWins = 0;
  const drawProbs: number[] = [];

  played.forEach(f => {
    const parsed = parseScore(f.result!);
    if (!parsed) return;
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN } = f.prediction;
    const actual = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best   = HOME_WIN >= DRAW && HOME_WIN >= AWAY_WIN ? "HOME_WIN"
                 : AWAY_WIN >= DRAW && AWAY_WIN >= HOME_WIN ? "AWAY_WIN" : "DRAW";
    if (best === actual) correct++;
    if (hs > as_) homeWins++;
    if (actual === "DRAW") drawProbs.push(DRAW);
  });

  const total    = played.length;
  const accPct   = total ? (correct / total * 100).toFixed(1) : null;
  const basePct  = total ? (homeWins / total * 100).toFixed(1) : null;
  const delta    = accPct && basePct ? (+accPct - +basePct) : null;
  const avgDraw  = drawProbs.length ? (drawProbs.reduce((s, v) => s + v, 0) / drawProbs.length * 100).toFixed(1) : null;

  const rows = played.flatMap(f => {
    const parsed = parseScore(f.result!);
    if (!parsed) return [];
    const [hs, as_] = parsed;
    const pred   = predictedOutcome(f.prediction);
    const actual = hs > as_ ? "Home Win" : hs < as_ ? "Away Win" : "Draw";
    const ok     = pred === actual;
    return [{
      matchNumber: f.match_number,
      home: f.home_team,
      away: f.away_team,
      hs, as_,
      h: Math.round(f.prediction.HOME_WIN * 100),
      d: Math.round(f.prediction.DRAW * 100),
      a: Math.round(f.prediction.AWAY_WIN * 100),
      pred, actual, ok,
    }];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Page header */}
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
        Results
      </h1>

      {/* Stat summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Overall Accuracy",  value: accPct ? `${accPct}%` : "—",   sub: total ? `${correct} of ${total} correct` : "Awaiting results", color: "var(--accent)" },
          { label: "vs Home-Win Baseline", value: delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts` : "—", sub: basePct ? `Baseline: ${basePct}%` : "Awaiting results", color: delta !== null ? (delta >= 0 ? "var(--positive)" : "var(--negative)") : "var(--foreground)" },
          { label: "Avg Draw Probability",  value: avgDraw ? `${avgDraw}%` : "—",  sub: drawProbs.length ? `${drawProbs.length} draws so far` : "No draws yet", color: "var(--foreground)" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 0, padding: "10px 14px 12px", display: "flex", flexDirection: "column", minHeight: 90 }}>
            <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</span>
            <span style={{ fontSize: "1.625rem", fontWeight: 400, color: s.color, letterSpacing: "-0.02em", lineHeight: 1, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: "auto", paddingTop: 8 }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Paginated predictions table */}
      <ResultsTable rows={rows} />
    </div>
  );
}
