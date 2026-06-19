import Link from "next/link";
import TournamentOutlook from "./_components/TournamentOutlook";
import PerformanceAnalysis from "./_components/PerformanceAnalysis";
import MatchdaysCard from "./_components/MatchdaysCard";
import MatchRotator from "./_components/MatchRotator";

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

/* ─── Insight generators ────────────────────── */

function fieldInsight(ranked: [string, SimEntry][]): string | null {
  if (ranked.length < 3) return null;
  const [t1, p1] = ranked[0];
  const [t2, p2] = ranked[1];
  const [t3, p3] = ranked[2];
  const gap12 = p1.winner - p2.winner;
  const gap13 = p1.winner - p3.winner;

  // Only surface when there's something non-obvious to say
  const finalistTrap = ranked.slice(1, 7).find(([, p]) =>
    p.winner > 0.04 && p.final / p.winner > 2.6
  );

  if (gap12 > 0.06)
    return `${t1} has a clear edge — ${(gap12 * 100).toFixed(1)} points ahead of ${t2}, the largest gap in the simulation.`;
  if (gap13 < 0.035)
    return `An unusually open field — ${t1}, ${t2}, and ${t3} are separated by just ${(gap13 * 100).toFixed(1)} percentage points.`;
  if (finalistTrap) {
    const [ft, ftp] = finalistTrap;
    return `${ft} is a persistent finalist — reaching the final in ${(ftp.final * 100).toFixed(0)}% of trials — but converts to a title only ${(ftp.winner * 100).toFixed(1)}% of the time.`;
  }
  return null;
}

// Only annotate exceptions — balanced fixtures and genuine upset risks.
// Clear favorites need no explanation; the probabilities say it.
function matchAnnotation(f: Fixture): string | null {
  const { HOME_WIN, DRAW, AWAY_WIN, home_elo, away_elo } = f.prediction;
  const favIsHome = HOME_WIN >= AWAY_WIN;
  const underdog  = favIsHome ? f.away_team : f.home_team;
  const underdogP = Math.min(HOME_WIN, AWAY_WIN);
  const eloDiff   = Math.abs(home_elo - away_elo);

  if (DRAW > HOME_WIN && DRAW > AWAY_WIN)
    return `Draw is the single most likely outcome — neither side holds a clear edge.`;
  if (underdogP > 0.28 && eloDiff > 80)
    return `Upset watch — ${underdog} carries ${(underdogP * 100).toFixed(0)}% win probability despite the Elo gap.`;
  return null;
}

// Only surface xG insights when the deviation is meaningful (> 1.5 goals).
// Small deltas are noise at this sample size.
function xgOverInsight(team: string, delta: number): string | null {
  if (delta > 3.5)
    return `${team} has comprehensively outscored projections — the gap is large enough to suggest the model is underrating their attack.`;
  if (delta > 1.5)
    return `Finding the net more freely than expected — worth factoring into upcoming fixtures involving ${team}.`;
  return null;
}

function xgUnderInsight(team: string, delta: number): string | null {
  const abs = Math.abs(delta);
  if (abs > 3.5)
    return `${team} has significantly underdelivered — the model may have overestimated their firepower going in.`;
  if (abs > 1.5)
    return `Struggling to match expected output — either facing stiffer defenses than their Elo implied, or form is weaker than rated.`;
  return null;
}

// Only note upsets that are statistically surprising. A 35% underdog winning is not a story.
function upsetInsight(u: { team: string; prob: number }): string | null {
  if (u.prob < 0.15)
    return `${u.team} had just ${(u.prob * 100).toFixed(1)}% win probability — one of the more statistically surprising results of the tournament so far.`;
  if (u.prob < 0.28)
    return `${u.team} overturned clear odds at ${(u.prob * 100).toFixed(1)}% — a result the model rated as unlikely.`;
  return null;
}

// Only surface trend signal when the recent rate diverges meaningfully from overall.
// Stable tracking needs no annotation — the chart shows it.
function accuracyInsight(log: { ok: boolean }[], correct: number, total: number): string | null {
  if (total < 5) return null;
  const overall       = correct / total;
  const recent        = log.slice(-5);
  const recentCorrect = recent.filter(m => m.ok).length;
  const recentAcc     = recentCorrect / recent.length;

  if (recentAcc > overall + 0.15)
    return `Improving recently — ${recentCorrect} of the last ${recent.length} correct, above the ${(overall * 100).toFixed(0)}% overall rate.`;
  if (recentAcc < overall - 0.15)
    return `Struggling in recent fixtures — ${recentCorrect} of the last ${recent.length} correct, below the ${(overall * 100).toFixed(0)}% overall rate.`;
  return null;
}

/* ─── Section label ─────────────────────────── */

function SectionLabel({ text, href, linkLabel }: { text: string; href?: string; linkLabel?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
      <span style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--text-faint)", letterSpacing:"0.07em", textTransform:"uppercase" }}>
        {text}
      </span>
      {href && <Link href={href} className="back-link">{linkLabel ?? "See all →"}</Link>}
    </div>
  );
}

/* ─── Insight callout ───────────────────────── */

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize:"0.8125rem", color:"var(--text-muted)", lineHeight:1.65, margin:0 }}>
      {children}
    </p>
  );
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
  const second    = simRanked[1] ?? null;

  const xgEntries = stats ? Object.entries(stats.xgDelta).sort(([,a],[,b]) => b - a) : [];
  const xgOver    = xgEntries[0]  ?? null;
  const xgUnder   = xgEntries.length > 0 ? xgEntries[xgEntries.length - 1] : null;

  const gProgress = groupProgress(fixtures);
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
    return [{ ok: best === actual, home: f.home_team, away: f.away_team }];
  });

  // Pre-tournament: team projected to score most in their next match
  const upcomingXgPeak = upcoming.reduce<{ team: string; xg: number; opp: string } | null>((best, f) => {
    const home = { team: f.home_team, xg: f.prediction.home_xg, opp: f.away_team };
    const away = { team: f.away_team, xg: f.prediction.away_xg, opp: f.home_team };
    const pick = home.xg >= away.xg ? home : away;
    return !best || pick.xg > best.xg ? pick : best;
  }, null);

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

  // Hero narrative
  const gap = second ? topEntry!.winner - second[1].winner : 0;
  const heroConclusion =
    simRanked.length === 0 ? "Simulation loading"
    : topEntry!.winner > 0.20 ? `${topTeam} is the clear favorite`
    : topEntry!.winner > 0.12 ? `${topTeam} leads a crowded field`
    : `No clear favorite — ${topTeam} edges ahead`;

  const heroDetail = simRanked.length === 0
    ? "Tournament odds will appear once the simulation is available."
    : stats
      ? `${topTeam} leads 3,000 simulations at ${(topEntry!.winner * 100).toFixed(1)}%${gap > 0.05 ? ` — ${(gap * 100).toFixed(1)} points clear of ${second![0]}` : second ? `, with ${second[0]} the nearest challenger at ${(second[1].winner * 100).toFixed(1)}%` : ""}. The model has called ${stats.correct} of ${stats.total} matches correctly (${(stats.correct / stats.total * 100).toFixed(0)}%).`
      : `${topTeam} leads 3,000 simulations at ${(topEntry!.winner * 100).toFixed(1)}%${gap > 0.05 ? ` — a ${(gap * 100).toFixed(1)}-point edge over the field` : second ? `, narrowly ahead of ${second[0]} at ${(second[1].winner * 100).toFixed(1)}%` : ""}. Accuracy updates as results come in.`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* ── PAGE HEADER ────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h1 style={{ margin:0, fontSize:"1.75rem", fontWeight:800, letterSpacing:"-0.02em", color:"var(--foreground)" }}>
          World Cup 2026
        </h1>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.8125rem", color:"var(--text-muted)", background:"#ffffff", border:"1px solid var(--border)", borderRadius:8, padding:"6px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 6.5H15" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M11 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>June 11 – July 19</span>
        </div>
      </div>

      {/* ── 1. MATCHDAYS + MODEL SNAPSHOT ──────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:24, alignItems:"start" }}>

        {/* Model snapshot — right 1fr */}
        <div className="card" style={{ padding:"24px 28px", display:"flex", flexDirection:"column", justifyContent:"center", gap:20 }}>
          {topEntry && (
            <div>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--text-faint)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>
                Tournament Favorite
              </div>
              <div className="sport" style={{ fontSize:"2.5rem", color:"var(--accent)", lineHeight:1 }}>
                {(topEntry.winner * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize:"0.8125rem", color:"var(--text-muted)", marginTop:4 }}>
                {topTeam} to win
              </div>
              {second && (
                <div style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:6 }}>
                  {second[0]} {(second[1].winner * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}
          {stats && (
            <div>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--text-faint)", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>
                Model Accuracy
              </div>
              <div className="sport" style={{ fontSize:"2.5rem", lineHeight:1 }}>
                {(stats.correct / stats.total * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:4 }}>
                {stats.correct} of {stats.total} correct
              </div>
            </div>
          )}
        </div>

        <MatchdaysCard matchesPlayed={played.length} daysElapsed={daysElapsed} />
      </div>

      {/* ── 2. TOURNAMENT OUTLOOK ──────────────────────────────── */}
      <TournamentOutlook simulation={simulation} />

      {/* ── 3. PERFORMANCE ANALYSIS + KEY CHANGES ──────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, alignItems:"stretch" }}>

        {/* Dumbbell chart */}
        <PerformanceAnalysis
          teamXG={stats?.teamXG ?? {}}
          teamGoals={stats?.teamGoals ?? {}}
        />

        {/* Key Changes — 3 separate cards stacked */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Outperforming */}
          <div className="card" style={{ padding:"16px 20px", flex:1 }}>
            <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--positive)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>
              Outperforming
            </div>
            {xgOver ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <span style={{ fontSize:"0.9375rem", fontWeight:600 }}>{xgOver[0]}</span>
                  <span style={{ fontSize:"1.125rem", fontWeight:700, color:"var(--positive)" }}>+{xgOver[1].toFixed(1)} goals</span>
                </div>
                {xgOverInsight(xgOver[0], xgOver[1]) && <Insight>{xgOverInsight(xgOver[0], xgOver[1])}</Insight>}
              </>
            ) : (
              <span style={{ fontSize:"0.8125rem", color:"var(--text-faint)" }}>Awaiting results.</span>
            )}
          </div>

          {/* Underperforming */}
          <div className="card" style={{ padding:"16px 20px", flex:1 }}>
            <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--negative)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>
              Underperforming
            </div>
            {xgUnder ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <span style={{ fontSize:"0.9375rem", fontWeight:600 }}>{xgUnder[0]}</span>
                  <span style={{ fontSize:"1.125rem", fontWeight:700, color:"var(--negative)" }}>{xgUnder[1].toFixed(1)} goals</span>
                </div>
                {xgUnderInsight(xgUnder[0], xgUnder[1]) && <Insight>{xgUnderInsight(xgUnder[0], xgUnder[1])}</Insight>}
              </>
            ) : (
              <span style={{ fontSize:"0.8125rem", color:"var(--text-faint)" }}>Awaiting results.</span>
            )}
          </div>

          {/* Biggest Upset */}
          <div className="card" style={{ padding:"16px 20px", flex:1 }}>
            <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--text-faint)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>
              Biggest Upset
            </div>
            {upsetT ? (
              <>
                <div style={{ fontSize:"0.875rem", fontWeight:500, marginBottom:4 }}>
                  {upsetT.home} {upsetT.score} {upsetT.away}
                </div>
                <span style={{ fontSize:"0.75rem", color:"var(--negative)" }}>
                  winner at {(upsetT.prob * 100).toFixed(1)}% odds
                </span>
                {upsetInsight(upsetT) && <Insight>{upsetInsight(upsetT)}</Insight>}
              </>
            ) : (
              <span style={{ fontSize:"0.8125rem", color:"var(--text-faint)" }}>Awaiting results.</span>
            )}
          </div>

        </div>
      </div>

      {/* ── 4. UPCOMING + RESULTS ──────────────────────────────── */}
      <MatchRotator upcoming={upcoming} played={played} />

      {/* ── 4. PREDICTION ACCURACY ─────────────────────────────── */}
      <div>
        <SectionLabel text="Prediction Accuracy" href="/accuracy" linkLabel="Full report →" />
        <div>
          {matchLog.length === 0 ? (
            <span style={{ fontSize:"0.8125rem", color:"var(--text-faint)" }}>Awaiting first tournament results.</span>
          ) : (() => {
            const W = 540, H = 70;
            const PAD = { t: 10, r: 16, b: 14, l: 36 };
            const cW = W - PAD.l - PAD.r;
            const cH = H - PAD.t - PAD.b;
            const n  = matchLog.length;

            let runCorrect = 0;
            const pts = matchLog.map(({ ok }, i) => {
              if (ok) runCorrect++;
              const acc = runCorrect / (i + 1);
              const x   = PAD.l + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
              const y   = PAD.t + (1 - acc) * cH;
              return { x, y, ok, acc };
            });

            const polyline  = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            const finalAcc  = pts[pts.length - 1].acc;
            const refs      = [{ pct:1.0, label:"100%" }, { pct:0.5, label:"50%" }, { pct:0.0, label:"0%" }];
            const chartNote = accuracyInsight(matchLog, stats!.correct, stats!.total);

            return (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:20 }}>
                  <div style={{ flexShrink:0, paddingTop:4 }}>
                    <div className="sport" style={{ fontSize:"1.5rem", lineHeight:1, color:"var(--accent)" }}>
                      {(finalAcc * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:4 }}>
                      {stats!.correct} / {stats!.total} correct
                    </div>
                  </div>

                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H, display:"block", overflow:"visible" }}>
                    {refs.map(({ pct, label }) => {
                      const y = PAD.t + (1 - pct) * cH;
                      return (
                        <g key={label}>
                          <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y}
                            stroke="var(--border)" strokeWidth="1"
                            strokeDasharray={pct === 0.5 ? "3 3" : undefined} />
                          <text x={PAD.l - 6} y={y + 4} textAnchor="end"
                            style={{ fontSize:9, fill:"var(--text-faint)", fontFamily:"monospace" }}>
                            {label}
                          </text>
                        </g>
                      );
                    })}
                    {n > 1 && (
                      <polyline points={polyline} fill="none"
                        stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
                    )}
                    {pts.map(({ x, y, ok }, i) => (
                      <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3"
                        fill={ok ? "var(--positive)" : "var(--negative)"}
                        stroke="#ffffff" strokeWidth="1.5" />
                    ))}
                    <text x={PAD.l} y={H - 2} textAnchor="middle"
                      style={{ fontSize:9, fill:"var(--text-faint)" }}>1</text>
                    {n > 1 && (
                      <text x={PAD.l + cW} y={H - 2} textAnchor="middle"
                        style={{ fontSize:9, fill:"var(--text-faint)" }}>{n}</text>
                    )}
                  </svg>

                  <div style={{ flexShrink:0, display:"flex", flexDirection:"column", gap:8, paddingTop:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--positive)", flexShrink:0 }} />
                      <span style={{ fontSize:"0.75rem", color:"var(--text-faint)" }}>Correct</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--negative)", flexShrink:0 }} />
                      <span style={{ fontSize:"0.75rem", color:"var(--text-faint)" }}>Wrong</span>
                    </div>
                  </div>
                </div>

                {/* Only render trend annotation when there's a meaningful signal */}
                {chartNote && (
                  <div style={{ paddingTop:4 }}>
                    <Insight>{chartNote}</Insight>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── 5. GROUP ANALYSIS ──────────────────────────────────── */}
      <div>
        <SectionLabel text="Group Progress" />
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {deathGroup && played.length === 0 && (
            <Insight>
              {deathGroup.group} is the toughest draw on paper — {deathGroup.strongest.slice(0, 2).join(" and ")} give it the highest average tournament win probability of any group.
            </Insight>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"4px 0" }}>
            {gProgress.length === 0 ? (
              <span className="empty" style={{ gridColumn:"1 / -1" }}>No fixture data</span>
            ) : gProgress.map(([group, { played: p, total: t }]) => {
              const letter = group.replace("Group ", "");
              const done   = p === t;
              return (
                <div key={group} style={{ display:"flex", alignItems:"baseline", gap:5 }}>
                  <span style={{ fontSize:"0.75rem", fontWeight:700, color: done ? "var(--positive)" : "var(--foreground)" }}>
                    {letter}
                  </span>
                  <span style={{ fontSize:"0.6875rem", color: done ? "var(--positive)" : "var(--text-faint)", fontVariantNumeric:"tabular-nums" }}>
                    {p}/{t}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
