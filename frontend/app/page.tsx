import TournamentOutlook from "./_components/TournamentOutlook";
import AccuracyChart from "./_components/AccuracyChart";
import PerformanceAnalysis from "./_components/PerformanceAnalysis";
import WinTypeDonut from "./_components/WinTypeDonut";
import UnpredictableGroups from "./_components/UnpredictableGroups";
import TournamentBadge from "./_components/TournamentBadge";
import { parseScore, bestOutcomeKey } from "./_components/dateUtils";
import { Fixture, BASE } from "./_components/types";

type SimEntry = { r32:number; r16:number; qf:number; sf:number; final:number; winner:number };
type Simulation = Record<string, SimEntry>;

function deriveStats(played: Fixture[]) {
  if (!played.length) return null;
  let correct = 0;
  const xgDelta:   Record<string, number> = {};
  const teamXG:    Record<string, number> = {};
  const teamGoals: Record<string, number> = {};
  for (const f of played) {
    const parsed = parseScore(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN, home_xg, away_xg } = f.prediction;
    const actual = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best   = bestOutcomeKey(f.prediction);
    if (best === actual) correct++;
    xgDelta[f.home_team]  = (xgDelta[f.home_team]  ?? 0) + (hs  - home_xg);
    xgDelta[f.away_team]  = (xgDelta[f.away_team]  ?? 0) + (as_ - away_xg);
    teamXG[f.home_team]   = (teamXG[f.home_team]   ?? 0) + home_xg;
    teamXG[f.away_team]   = (teamXG[f.away_team]   ?? 0) + away_xg;
    teamGoals[f.home_team] = (teamGoals[f.home_team] ?? 0) + hs;
    teamGoals[f.away_team] = (teamGoals[f.away_team] ?? 0) + as_;
  }
  return { correct, total: played.length, xgDelta, teamXG, teamGoals };
}

/* ─── Dashboard ─────────────────────────────── */

export default async function Home() {
  let fixtures: Fixture[] = [];
  let simulation: Simulation = {};
  try {
    [fixtures, simulation] = await Promise.all([
      fetch(`${BASE}/fixtures`, { cache:"no-store" }).then(r => r.json()),
      fetch(`${BASE}/simulate`,  { next: { revalidate: 3600 } }).then(r => r.json()),
    ]);
  } catch {}

  const played   = fixtures.filter(f => f.result !== null);
  const upcoming = fixtures.filter(f => f.result === null);
  const stats    = deriveStats(played);

  const simRanked = Object.entries(simulation).sort(([,a],[,b]) => b.winner - a.winner);
  const [topTeam, topEntry] = simRanked[0] ?? ["—", null];

  const xgEntries = stats ? Object.entries(stats.xgDelta).sort(([,a],[,b]) => b - a) : [];
  const xgOver    = xgEntries[0] ?? null;
  const xgUnder   = xgEntries.length > 0 ? xgEntries[xgEntries.length - 1] : null;

  const matchLog = played.flatMap(f => {
    const parsed = parseScore(f.result!);
    if (!parsed) return [];
    const [hs, as_] = parsed;
    const actual = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best   = bestOutcomeKey(f.prediction);
    return [{ ok: best === actual, home: f.home_team, away: f.away_team, match_number: f.match_number }];
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, height:"calc(100vh - 88px)", overflow:"hidden" }}>

      {/* ── PAGE HEADER ────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <h1 style={{ margin:0, fontSize:"1.375rem", fontWeight:700, letterSpacing:"-0.02em", color:"var(--foreground)" }}>
          World Cup 2026
        </h1>
        <TournamentBadge />
      </div>

      {/* ── 1. KPI CARDS ───────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8, flexShrink:0 }}>

        {/* 1 — Tournament Favorite */}
        <div className="kpi-card-dark" style={{ background:"#1B4332", borderRadius: 0, padding:"8px 16px 12px", display:"flex", flexDirection:"column", height:80 }}>
          <span className="label-upper" style={{ fontSize:"0.625rem", fontWeight:700, color:"rgba(255,255,255,0.5)" }}>
            Tournament Favorite
          </span>
          <span style={{ fontSize:"1.375rem", fontWeight:400, color:"#ffffff", letterSpacing:"-0.03em", lineHeight:1.1, marginTop:2 }}>
            {topTeam ?? "—"}
          </span>
          <span className="num" style={{ fontSize:"0.6875rem", color:"rgba(255,255,255,0.45)", marginTop:1 }}>
            {topEntry ? `${(topEntry.winner * 100).toFixed(1)}% to win` : "—"}
          </span>
        </div>

        {/* 2 — Outperforming */}
        <div className="kpi-card-white" style={{ background:"var(--card-bg)", borderRadius: 0, padding:"8px 16px 12px", display:"flex", flexDirection:"column", height:80, border:"1px solid var(--border-soft)" }}>
          <span className="label-upper" style={{ fontSize:"0.625rem", fontWeight:700, color:"#2E8B57" }}>
            Outperforming
          </span>
          <span className="kpi-text" style={{ fontSize:"1.375rem", fontWeight:400, color:"var(--kpi-text)", letterSpacing:"-0.03em", lineHeight:1.1, marginTop:2 }}>
            {xgOver ? xgOver[0] : "—"}
          </span>
          <span className="num" style={{ fontSize:"0.6875rem", color:"#2E8B57", marginTop:1 }}>
            {xgOver ? `+${xgOver[1].toFixed(1)} goals vs xG` : "awaiting results"}
          </span>
        </div>

        {/* 3 — Underperforming */}
        <div className="kpi-card-white" style={{ background:"var(--card-bg)", borderRadius: 0, padding:"8px 16px 12px", display:"flex", flexDirection:"column", height:80, border:"1px solid var(--border-soft)" }}>
          <span className="label-upper" style={{ fontSize:"0.625rem", fontWeight:700, color:"#B5483F" }}>
            Underperforming
          </span>
          <span className="kpi-text" style={{ fontSize:"1.375rem", fontWeight:400, color:"var(--kpi-text)", letterSpacing:"-0.03em", lineHeight:1.1, marginTop:2 }}>
            {xgUnder ? xgUnder[0] : "—"}
          </span>
          <span className="num" style={{ fontSize:"0.6875rem", color:"#B5483F", marginTop:1 }}>
            {xgUnder ? `${xgUnder[1].toFixed(1)} goals vs xG` : "awaiting results"}
          </span>
        </div>

        {/* 4 — Prediction Accuracy */}
        <div className="kpi-card-white" style={{ background:"var(--card-bg)", borderRadius: 0, padding:"8px 16px 12px", display:"flex", flexDirection:"column", height:80, border:"1px solid var(--border-soft)" }}>
          <span className="label-upper" style={{ fontSize:"0.625rem", fontWeight:700, color:"#C9981A" }}>
            Prediction Accuracy
          </span>
          <span className="kpi-text num-lg" style={{ fontSize:"1.75rem", fontWeight:400, color:"var(--kpi-text)", lineHeight:1, marginTop:2 }}>
            {stats ? `${(stats.correct / stats.total * 100).toFixed(0)}%` : "—"}
          </span>
          <span className="num" style={{ fontSize:"0.6875rem", color:"#C9981A", marginTop:1 }}>
            {stats ? `${stats.correct} of ${stats.total} correct` : "awaiting results"}
          </span>
        </div>

        {/* 5 — Matches Remaining */}
        <div className="kpi-card-white" style={{ background:"var(--card-bg)", borderRadius: 0, padding:"8px 16px 12px", display:"flex", flexDirection:"column", height:80, border:"1px solid var(--border-soft)" }}>
          <span className="label-upper" style={{ fontSize:"0.625rem", fontWeight:700, color:"#3D6B52" }}>
            Matches Remaining
          </span>
          <span className="kpi-text num-lg" style={{ fontSize:"1.75rem", fontWeight:400, color:"var(--kpi-text)", lineHeight:1, marginTop:2 }}>
            {upcoming.length}
          </span>
          <span className="num" style={{ fontSize:"0.6875rem", color:"#3D6B52", marginTop:1 }}>
            {played.length} played
          </span>
        </div>

      </div>

      {/* ── 2. CHARTS ──────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, flex:1, minHeight:0 }}>
        <TournamentOutlook simulation={simulation} />
        <AccuracyChart matchLog={matchLog} />
      </div>

      {/* ── 3. BOTTOM PANELS ───────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, flex:1, minHeight:0 }}>
        <WinTypeDonut played={played} showSeeAll />
        <PerformanceAnalysis teamXG={stats?.teamXG ?? {}} teamGoals={stats?.teamGoals ?? {}} />
        <UnpredictableGroups fixtures={fixtures} showSeeAll />
      </div>

    </div>
  );
}
