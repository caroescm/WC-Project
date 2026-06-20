import AccuracyChart, { MatchEntry } from "../_components/AccuracyChart";
import { parseScore, predictedOutcome } from "../_components/dateUtils";
import TournamentBadge from "../_components/TournamentBadge";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number }
interface Fixture { match_number: number; date: string; location: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";

function MiniBar({ h, d, a }: { h: number; d: number; a: number }) {
  return (
    <div style={{ display: "flex", height: 5, borderRadius: 0, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${h}%`, background: "#1a1628" }} />
      <div style={{ width: `${d}%`, background: "#a78bfa" }} />
      <div style={{ width: `${a}%`, background: "#f472b6" }} />
    </div>
  );
}

export default async function ResultsPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()); } catch {}

  const played = fixtures.filter(f => f.result !== null);

  let correct = 0, homeWins = 0;
  const drawProbs: number[] = [];

  const matchLog: MatchEntry[] = played.flatMap(f => {
    const parsed = parseScore(f.result!);
    if (!parsed) return [];
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN } = f.prediction;
    const actual = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best   = HOME_WIN >= DRAW && HOME_WIN >= AWAY_WIN ? "HOME_WIN"
                 : AWAY_WIN >= DRAW && AWAY_WIN >= HOME_WIN ? "AWAY_WIN" : "DRAW";
    const ok = best === actual;
    if (ok) correct++;
    if (hs > as_) homeWins++;
    if (actual === "DRAW") drawProbs.push(DRAW);
    return [{ ok, home: f.home_team, away: f.away_team, match_number: f.match_number }];
  });

  const total    = matchLog.length;
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
    return [{ f, pred, actual, ok, hs, as_ }];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          Results
        </h1>
        <TournamentBadge />
      </div>

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

      {/* Accuracy line chart */}
      <AccuracyChart matchLog={matchLog} />

      {/* Archive table */}
      <div className="card table-wrap">
        <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "#0e1420" }}>Match Archive</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginLeft: 10 }}>{total} matches played</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty">No matches played yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                {["Match", "Score", "Probabilities", "Predicted", "Actual", ""].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ f, pred, actual, ok, hs, as_ }) => {
                const h = Math.round(f.prediction.HOME_WIN * 100);
                const d = Math.round(f.prediction.DRAW * 100);
                const a = Math.round(f.prediction.AWAY_WIN * 100);
                return (
                  <tr key={f.match_number} className="table-row">
                    <td className="table-cell" style={{ fontWeight: 500 }}>
                      {f.home_team} <span style={{ color: "var(--text-faint)" }}>vs</span> {f.away_team}
                    </td>
                    <td className="table-cell">
                      <span style={{ fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>{hs} – {as_}</span>
                    </td>
                    <td className="table-cell" style={{ minWidth: 120 }}>
                      <MiniBar h={h} d={d} a={a} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", color: "var(--text-faint)", marginTop: 3 }}>
                        <span>{h}%</span><span>{d}%</span><span>{a}%</span>
                      </div>
                    </td>
                    <td className="table-cell" style={{ color: "var(--text-faint)", fontSize: "0.8125rem" }}>{pred}</td>
                    <td className="table-cell" style={{ color: "var(--text-faint)", fontSize: "0.8125rem" }}>{actual}</td>
                    <td className="table-cell">
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ok ? "var(--positive)" : "var(--negative)", background: ok ? "var(--positive-dim)" : "var(--negative-dim)", borderRadius: 0, padding: "2px 7px" }}>
                        {ok ? "✓ Correct" : "✗ Missed"}
                      </span>
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
