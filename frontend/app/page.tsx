import Link from "next/link";

/* ─── Types ────────────────────────────────────── */
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

/* ─── Data helpers ──────────────────────────────── */
function parseResult(result: string): [number, number] | null {
  const m = result.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

function deriveStats(played: Fixture[]) {
  if (!played.length) return null;

  let correct = 0, homeWins = 0;
  const drawMatches: { prob: number }[] = [];
  const upsets: { team: string; prob: number; score: string; home: string; away: string }[] = [];
  const xgDelta: Record<string, number> = {};

  for (const f of played) {
    const parsed = parseResult(f.result!);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    const { HOME_WIN, DRAW, AWAY_WIN, home_xg, away_xg } = f.prediction;

    const actual   = hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
    const best     = HOME_WIN >= DRAW && HOME_WIN >= AWAY_WIN ? "HOME_WIN"
                   : AWAY_WIN >= DRAW && AWAY_WIN >= HOME_WIN ? "AWAY_WIN" : "DRAW";
    if (best === actual) correct++;
    if (hs > as_) homeWins++;

    if (actual === "DRAW") drawMatches.push({ prob: DRAW });

    // xG delta
    xgDelta[f.home_team] = (xgDelta[f.home_team] ?? 0) + (hs  - home_xg);
    xgDelta[f.away_team] = (xgDelta[f.away_team] ?? 0) + (as_ - away_xg);

    // Upset: who won and at what odds?
    const winnerTeam = hs > as_ ? f.home_team : as_ > hs ? f.away_team : null;
    const winnerProb = hs > as_ ? HOME_WIN    : as_ > hs ? AWAY_WIN    : null;
    if (winnerTeam && winnerProb !== null) {
      upsets.push({ team: winnerTeam, prob: winnerProb,
                    score: f.result!, home: f.home_team, away: f.away_team });
    }
  }

  const avgDrawProb = drawMatches.length
    ? drawMatches.reduce((s, d) => s + d.prob, 0) / drawMatches.length : 0;

  upsets.sort((a, b) => a.prob - b.prob);

  const baseline = homeWins / played.length;

  return { correct, total: played.length, baseline, avgDrawProb,
           drawCount: drawMatches.length, upsets, xgDelta };
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

/* ─── Sub-components (inline, no client state needed) ── */
function PanelHeader({ label, href }: { label: string; href?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
                     textTransform:"uppercase", color:"var(--text-muted)" }}>{label}</span>
      {href && (
        <Link href={href} style={{ fontSize:11, color:"var(--accent)", textDecoration:"none" }}>
          View all →
        </Link>
      )}
    </div>
  );
}

function KpiCard({ label, big, sub, subColor }:
  { label:string; big:string; sub?:string; subColor?:string }) {
  return (
    <div className="grad-border" style={{ borderRadius:16, padding:"14px 16px", display:"flex",
         flexDirection:"column", gap:4 }}>
      <span style={{ fontSize:10, fontWeight:600, letterSpacing:"0.16em", textTransform:"uppercase",
                     color:"var(--text-muted)" }}>{label}</span>
      <span className="sport" style={{ fontSize:26, color:"var(--foreground)", lineHeight:1.1 }}>{big}</span>
      {sub && <span style={{ fontSize:12, color: subColor ?? "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default async function Home() {
  let fixtures: Fixture[] = [];
  let simulation: Simulation = {};

  try {
    [fixtures, simulation] = await Promise.all([
      fetch("https://wc-project-production.up.railway.app/fixtures", { cache:"no-store" }).then(r => r.json()),
      fetch("https://wc-project-production.up.railway.app/simulate",  { cache:"no-store" }).then(r => r.json()),
    ]);
  } catch { /* backend offline — all panels show placeholders */ }

  const played   = fixtures.filter(f => f.result !== null);
  const upcoming = fixtures.filter(f => f.result === null);
  const stats    = deriveStats(played);

  // Simulation top 8
  const simRanked = Object.entries(simulation)
    .sort(([,a],[,b]) => b.winner - a.winner)
    .slice(0, 8);
  const maxWinner = simRanked[0]?.[1].winner ?? 1;

  // xG over/under
  const xgEntries = stats
    ? Object.entries(stats.xgDelta).sort(([,a],[,b]) => b - a) : [];
  const xgOver  = xgEntries.slice(0, 3);
  const xgUnder = [...xgEntries].sort(([,a],[,b]) => a - b).slice(0, 3);

  // Group progress
  const gProgress = groupProgress(fixtures);

  // KPI values
  const accuracy  = stats ? `${stats.correct} / ${stats.total}` : "—";
  const accPct    = stats ? `${((stats.correct / stats.total)*100).toFixed(1)}% correct` : "No matches played yet";
  const blPts     = stats ? ((stats.correct/stats.total) - stats.baseline) * 100 : null;
  const blStr     = blPts !== null ? `${blPts >= 0 ? "+" : ""}${blPts.toFixed(1)} pts vs baseline` : "—";
  const drawStr   = stats ? `${stats.drawCount} / ${stats.total} real draws` : "—";
  const drawSub   = stats?.drawCount ? `Avg draw prob ${(stats.avgDrawProb*100).toFixed(1)}%` : undefined;
  const upsetTeam = stats?.upsets[0];
  const upsetStr  = upsetTeam ? upsetTeam.team : "—";
  const upsetSub  = upsetTeam ? `won at ${(upsetTeam.prob*100).toFixed(1)}% odds` : "No matches played yet";

  const cell: React.CSSProperties = { minWidth: 0 };

  return (
    <div style={{ display:"grid", gridTemplateRows:"auto 1fr 1fr", gap:8,
                  height:"100%", minHeight:0 }}>

      {/* ── Row 1: KPI cards ─────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        <KpiCard label="Model Accuracy" big={accuracy} sub={accPct} />
        <KpiCard label="vs Baseline" big={blPts !== null ? `${blPts >= 0?"+":""}${blPts.toFixed(1)} pts` : "—"}
                 sub={blPts !== null ? blStr : "No matches played yet"}
                 subColor={blPts !== null ? (blPts >= 0 ? "#4caf50" : "#ef4444") : undefined} />
        <KpiCard label="Draws Called" big={drawStr} sub={drawSub} />
        <KpiCard label="Biggest Upset" big={upsetStr} sub={upsetSub} />
      </div>

      {/* ── Row 2 ────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, minHeight:0 }}>

        {/* Monte Carlo */}
        <div className="grad-border-gold" style={{ borderRadius:16, padding:"14px 16px",
             display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <PanelHeader label="Tournament Odds" href="/montecarlo" />
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:5 }}>
            {simRanked.length === 0 && (
              <span style={{ fontSize:12, color:"var(--text-muted)" }}>Simulation unavailable</span>
            )}
            {simRanked.map(([team, p], i) => (
              <div key={team} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:16, fontSize:11, color:"var(--text-muted)", textAlign:"right",
                               flexShrink:0 }}>{i+1}</span>
                <span style={{ width:110, fontSize:12, fontWeight:500, color:"var(--foreground)",
                               flexShrink:0, overflow:"hidden", textOverflow:"ellipsis",
                               whiteSpace:"nowrap" }}>{team}</span>
                <div style={{ flex:1, height:5, borderRadius:3,
                              background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ height:"100%", borderRadius:3, background:"var(--accent)",
                                width:`${(p.winner/maxWinner)*100}%`,
                                transition:"width 0.6s ease" }} />
                </div>
                <span style={{ width:36, fontSize:12, fontWeight:700, color:"var(--accent)",
                               textAlign:"right", flexShrink:0 }}>
                  {(p.winner*100).toFixed(1)}%
                </span>
                <span style={{ fontSize:10, padding:"2px 6px", borderRadius:6, flexShrink:0,
                               background:"rgba(201,168,76,0.1)", color:"var(--accent)" }}>
                  F {(p.final*100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* xG Performance */}
        <div className="grad-border-blue" style={{ borderRadius:16, padding:"14px 16px",
             display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <PanelHeader label="xG Performance" href="/performance" />
          {xgEntries.length === 0 ? (
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>No matches played yet</span>
          ) : (
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <span style={{ fontSize:10, fontWeight:600, color:"#4caf50",
                               letterSpacing:"0.12em", textTransform:"uppercase" }}>
                  Outperforming
                </span>
                <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:5 }}>
                  {xgOver.map(([team, delta]) => (
                    <div key={team} style={{ display:"flex", justifyContent:"space-between",
                         alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"var(--foreground)" }}>{team}</span>
                      <span style={{ fontSize:11, padding:"2px 7px", borderRadius:6, fontWeight:600,
                                     background:"rgba(76,175,80,0.12)", color:"#4caf50" }}>
                        +{delta.toFixed(1)} g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize:10, fontWeight:600, color:"#ef4444",
                               letterSpacing:"0.12em", textTransform:"uppercase" }}>
                  Underperforming
                </span>
                <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:5 }}>
                  {xgUnder.map(([team, delta]) => (
                    <div key={team} style={{ display:"flex", justifyContent:"space-between",
                         alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"var(--foreground)" }}>{team}</span>
                      <span style={{ fontSize:11, padding:"2px 7px", borderRadius:6, fontWeight:600,
                                     background:"rgba(239,68,68,0.12)", color:"#ef4444" }}>
                        {delta.toFixed(1)} g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3 ────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, minHeight:0 }}>

        {/* Next matches */}
        <div className="grad-border" style={{ borderRadius:16, padding:"14px 16px",
             display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden", ...cell }}>
          <PanelHeader label="Next Matches" href="/upcoming" />
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
            {upcoming.slice(0,3).map(f => (
              <div key={f.match_number} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"var(--foreground)" }}>
                    {f.home_team} <span style={{ color:"var(--text-muted)", fontWeight:400 }}>vs</span> {f.away_team}
                  </span>
                  <span style={{ fontSize:10, color:"var(--text-muted)", flexShrink:0, marginLeft:6 }}>
                    {f.group || "KO"}
                  </span>
                </div>
                <div style={{ fontSize:10, color:"var(--text-muted)" }}>
                  {f.date}
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  {[
                    { label:`HW ${(f.prediction.HOME_WIN*100).toFixed(0)}%`, color:"var(--accent)" },
                    { label:`D ${(f.prediction.DRAW*100).toFixed(0)}%`,       color:"var(--text-muted)" },
                    { label:`AW ${(f.prediction.AWAY_WIN*100).toFixed(0)}%`,  color:"var(--blue)" },
                  ].map(pill => (
                    <span key={pill.label} style={{ fontSize:10, padding:"1px 6px", borderRadius:5,
                          background:"rgba(255,255,255,0.04)", color:pill.color, border:"1px solid var(--border)" }}>
                      {pill.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && (
              <span style={{ fontSize:12, color:"var(--text-muted)" }}>No upcoming fixtures</span>
            )}
          </div>
        </div>

        {/* Upsets */}
        <div className="grad-border" style={{ borderRadius:16, padding:"14px 16px",
             display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden", ...cell }}>
          <PanelHeader label="Biggest Upsets" href="/upsets" />
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
            {!stats || stats.upsets.length === 0 ? (
              <span style={{ fontSize:12, color:"var(--text-muted)" }}>No matches played yet</span>
            ) : stats.upsets.slice(0,3).map((u, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:12, fontWeight:600, color:"var(--foreground)" }}>
                  {u.home} {u.score} {u.away}
                </span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:6,
                                 background:"rgba(239,68,68,0.12)", color:"#ef4444" }}>
                    won at {(u.prob*100).toFixed(1)}% odds
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group progress */}
        <div className="grad-border" style={{ borderRadius:16, padding:"14px 16px",
             display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden", ...cell }}>
          <PanelHeader label="Group Progress" />
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:5 }}>
            {gProgress.map(([group, { played: p, total: t }]) => {
              const letter = group.replace("Group ", "");
              const pct    = t > 0 ? (p / t) * 100 : 0;
              return (
                <div key={group} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:14, fontSize:11, fontWeight:700, color:"var(--text-muted)",
                                 flexShrink:0 }}>{letter}</span>
                  <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(255,255,255,0.06)" }}>
                    <div style={{ height:"100%", borderRadius:2, background:"var(--accent)",
                                  width:`${pct}%`, transition:"width 0.5s ease" }} />
                  </div>
                  <span style={{ fontSize:10, color:"var(--text-muted)", flexShrink:0 }}>
                    {p}/{t}
                  </span>
                </div>
              );
            })}
            {gProgress.length === 0 && (
              <span style={{ fontSize:12, color:"var(--text-muted)" }}>No fixture data</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
