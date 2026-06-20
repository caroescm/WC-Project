import Link from "next/link";
import TournamentOutlook from "./_components/TournamentOutlook";
import AccuracyChart from "./_components/AccuracyChart";
import PerformanceAnalysis from "./_components/PerformanceAnalysis";
import WinTypeDonut from "./_components/WinTypeDonut";
import UnpredictableGroups from "./_components/UnpredictableGroups";

interface Prediction {
  HOME_WIN: number; DRAW: number; AWAY_WIN: number;
  home_elo: number; away_elo: number;
  home_xg: number;  away_xg: number;
}
interface Fixture {
  match_number: number; date: string; location: string;
  home_team: string;   away_team: string;
  group: string;       result: string | null;
  prediction: Prediction;
}
type SimEntry = { r32:number; r16:number; qf:number; sf:number; final:number; winner:number };
type Simulation = Record<string, SimEntry>;

function parseResult(result: string): [number, number] | null {
  const m = result.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

function deriveStats(played: Fixture[]) {
  if (!played.length) return null;
  let correct = 0, homeWins = 0;
  const drawMatches: { prob: number }[] = [];
  const upsets: { team: string; prob: number; score: string; home: string; away: string }[] = [];
  const xgDelta:   Record<string, number> = {};
  const teamXG:    Record<string, number> = {};
  const teamGoals: Record<string, number> = {};
  for (const f of played) {
    const parsed = parseResult(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN, home_xg, away_xg } = f.prediction;
    const actual = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best   = HOME_WIN >= DRAW && HOME_WIN >= AWAY_WIN ? "HOME_WIN"
                 : AWAY_WIN >= DRAW && AWAY_WIN >= HOME_WIN ? "AWAY_WIN" : "DRAW";
    if (best === actual) correct++;
    if (hs > as_) homeWins++;
    if (actual === "DRAW") drawMatches.push({ prob: DRAW });
    xgDelta[f.home_team]  = (xgDelta[f.home_team]  ?? 0) + (hs  - home_xg);
    xgDelta[f.away_team]  = (xgDelta[f.away_team]  ?? 0) + (as_ - away_xg);
    teamXG[f.home_team]   = (teamXG[f.home_team]   ?? 0) + home_xg;
    teamXG[f.away_team]   = (teamXG[f.away_team]   ?? 0) + away_xg;
    teamGoals[f.home_team] = (teamGoals[f.home_team] ?? 0) + hs;
    teamGoals[f.away_team] = (teamGoals[f.away_team] ?? 0) + as_;
    const winnerTeam = hs > as_ ? f.home_team : as_ > hs ? f.away_team : null;
    const winnerProb = hs > as_ ? HOME_WIN    : as_ > hs ? AWAY_WIN    : null;
    if (winnerTeam && winnerProb !== null)
      upsets.push({ team: winnerTeam, prob: winnerProb, score: f.result!, home: f.home_team, away: f.away_team });
  }
  const avgDrawProb = drawMatches.length
    ? drawMatches.reduce((s, d) => s + d.prob, 0) / drawMatches.length : 0;
  upsets.sort((a, b) => a.prob - b.prob);
  return { correct, total: played.length, baseline: homeWins / played.length,
           avgDrawProb, drawCount: drawMatches.length, upsets, xgDelta, teamXG, teamGoals };
}

function groupProgress(fixtures: Fixture[]) {
  const groups: Record<string, { played: number; total: number }> = {};
  for (const f of fixtures) {
    if (!f.group) continue;
    if (!groups[f.group]) groups[f.group] = { played: 0, total: 0 };
    groups[f.group].total++;
    if (f.result) groups[f.group].played++;
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

/* ─── Dashboard ─────────────────────────────── */

export default async function Home() {
  let fixtures: Fixture[] = [];
  let simulation: Simulation = {};
  try {
    [fixtures, simulation] = await Promise.all([
      fetch(`${process.env.API_URL ?? "https://wc-project-production.up.railway.app"}/fixtures`, { cache:"no-store" }).then(r => r.json()),
      fetch(`${process.env.API_URL ?? "https://wc-project-production.up.railway.app"}/simulate`,  { next: { revalidate: 3600 } }).then(r => r.json()),
    ]);
  } catch {}

  const played   = fixtures.filter(f => f.result !== null);
  const upcoming = fixtures.filter(f => f.result === null);
  const stats    = deriveStats(played);

  const tournamentStart = new Date("2026-06-11");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysElapsed = Math.min(39, Math.max(0, Math.round((today.getTime() - tournamentStart.getTime()) / 86400000) + 1));

  const simRanked = Object.entries(simulation).sort(([,a],[,b]) => b.winner - a.winner);
  const [topTeam, topEntry] = simRanked[0] ?? ["—", null];

  const xgEntries = stats ? Object.entries(stats.xgDelta).sort(([,a],[,b]) => b - a) : [];
  const xgOver    = xgEntries[0]  ?? null;
  const xgUnder   = xgEntries.length > 0 ? xgEntries[xgEntries.length - 1] : null;

  const upsetT    = stats?.upsets[0];

  // Per-match log for accuracy chart
  const matchLog = played.flatMap(f => {
    const parsed = parseResult(f.result!);
    if (!parsed) return [];
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN } = f.prediction;
    const actual = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best   = HOME_WIN >= DRAW && HOME_WIN >= AWAY_WIN ? "HOME_WIN"
                 : AWAY_WIN >= DRAW && AWAY_WIN >= HOME_WIN ? "AWAY_WIN" : "DRAW";
    return [{ ok: best === actual, home: f.home_team, away: f.away_team, match_number: f.match_number }];
  });

  // Group of death: highest average winner% among group members
  const groupTeamMap: Record<string, Set<string>> = {};
  for (const f of fixtures) {
    if (!f.group) continue;
    if (!groupTeamMap[f.group]) groupTeamMap[f.group] = new Set();
    groupTeamMap[f.group].add(f.home_team);
    groupTeamMap[f.group].add(f.away_team);
  }
  const groupStrength = Object.entries(groupTeamMap)
    .map(([g, teams]) => {
      const arr = [...teams];
      const avgWin = arr.reduce((s, t) => s + (simulation[t]?.winner ?? 0), 0) / arr.length;
      const strongest = arr.sort((a, b) => (simulation[b]?.winner ?? 0) - (simulation[a]?.winner ?? 0)).slice(0, 2);
      return { group: g, avgWin, strongest };
    })
    .sort((a, b) => b.avgWin - a.avgWin);
  const deathGroup = groupStrength[0] ?? null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

      {/* ── PAGE HEADER ────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <h1 style={{ margin:0, fontSize:"1.375rem", fontWeight:700, letterSpacing:"-0.02em", color:"var(--foreground)" }}>
          World Cup 2026
        </h1>
        <div className="date-badge" style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.8125rem", color:"var(--text-muted)", background:"var(--card-bg)", border:"1px solid var(--border-soft)", borderRadius: 0, padding:"8px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 6.5H15" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M11 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>June 11 – July 19</span>
        </div>
      </div>

      {/* ── 1. KPI CARDS ───────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8 }}>

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
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, alignItems:"stretch", marginTop:8.5 }}>
        <TournamentOutlook simulation={simulation} />
        <AccuracyChart matchLog={matchLog} />
      </div>

      {/* ── 3. BOTTOM PANELS ───────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, alignItems:"stretch", marginTop:8.5 }}>
        <WinTypeDonut played={played} />
        <PerformanceAnalysis teamXG={stats?.teamXG ?? {}} teamGoals={stats?.teamGoals ?? {}} />
        <UnpredictableGroups fixtures={fixtures} />
      </div>


    </div>
  );
}
