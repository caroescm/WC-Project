import Link from "next/link";

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
  const xgDelta: Record<string, number> = {};
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
    xgDelta[f.home_team] = (xgDelta[f.home_team] ?? 0) + (hs  - home_xg);
    xgDelta[f.away_team] = (xgDelta[f.away_team] ?? 0) + (as_ - away_xg);
    const winnerTeam = hs > as_ ? f.home_team : as_ > hs ? f.away_team : null;
    const winnerProb = hs > as_ ? HOME_WIN    : as_ > hs ? AWAY_WIN    : null;
    if (winnerTeam && winnerProb !== null)
      upsets.push({ team: winnerTeam, prob: winnerProb, score: f.result!, home: f.home_team, away: f.away_team });
  }
  const avgDrawProb = drawMatches.length
    ? drawMatches.reduce((s, d) => s + d.prob, 0) / drawMatches.length : 0;
  upsets.sort((a, b) => a.prob - b.prob);
  return { correct, total: played.length, baseline: homeWins / played.length,
           avgDrawProb, drawCount: drawMatches.length, upsets, xgDelta };
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

const IconTarget = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="1" fill="currentColor"/>
  </svg>
);
const IconTrend = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <polyline points="1,11 5,7 9,9 15,3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <polyline points="11,3 15,3 15,7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);
const IconSlash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="12" height="2" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="2" y="9" width="8" height="2" rx="1" fill="currentColor"/>
  </svg>
);
const IconBolt = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M9.5 1.5L4 9h5l-2.5 5.5L14 7H9l.5-5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

/* ─── KPI ──────────────────────────────────── */

function KpiCard({ label, big, sub, subColor, borderColor, iconBg, iconColor, Icon }: {
  label: string; big: string; sub?: string; subColor?: string;
  borderColor: string; iconBg: string; iconColor: string;
  Icon: () => React.ReactElement;
}) {
  return (
    <div className="card" style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)" }}>{label}</span>
        <div style={{ width:24, height:24, borderRadius:4, background:iconBg,
                      color:iconColor, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon />
        </div>
      </div>
      <span className="sport" style={{ fontSize:"1.375rem", fontWeight:800, color:"var(--foreground)" }}>{big}</span>
      {sub && <span style={{ fontSize:12, color: subColor ?? "var(--text-faint)" }}>{sub}</span>}
    </div>
  );
}

/* ─── Dashboard ────────────────────────────── */

export default async function Home() {
  let fixtures: Fixture[] = [];
  let simulation: Simulation = {};
  try {
    [fixtures, simulation] = await Promise.all([
      fetch("https://wc-project-production.up.railway.app/fixtures", { cache:"no-store" }).then(r => r.json()),
      fetch("https://wc-project-production.up.railway.app/simulate",  { next: { revalidate: 3600 } }).then(r => r.json()),
    ]);
  } catch {}

  const played   = fixtures.filter(f => f.result !== null);
  const upcoming = fixtures.filter(f => f.result === null);
  const stats    = deriveStats(played);

  const simRanked = Object.entries(simulation)
    .sort(([,a],[,b]) => b.winner - a.winner).slice(0, 8);
  const maxWinner = simRanked[0]?.[1].winner ?? 1;

  const xgEntries = stats ? Object.entries(stats.xgDelta).sort(([,a],[,b]) => b - a) : [];
  const xgOver    = xgEntries.slice(0, 3);
  const xgUnder   = [...xgEntries].sort(([,a],[,b]) => a - b).slice(0, 3);

  const gProgress = groupProgress(fixtures);

  const blPts  = stats ? ((stats.correct/stats.total) - stats.baseline) * 100 : null;
  const upsetT = stats?.upsets[0];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard
          label="Model Accuracy" Icon={IconTarget}
          big={stats ? `${stats.correct} / ${stats.total}` : "—"}
          sub={stats ? `${((stats.correct/stats.total)*100).toFixed(1)}% correct` : "No matches yet"}
          borderColor="var(--accent)" iconBg="var(--accent-dim)" iconColor="var(--accent)" />
        <KpiCard
          label="vs Baseline" Icon={IconTrend}
          big={blPts !== null ? `${blPts >= 0?"+":""}${blPts.toFixed(1)} pts` : "—"}
          sub={blPts !== null ? `vs home-win baseline` : "No matches yet"}
          subColor={blPts !== null ? (blPts >= 0 ? "var(--positive)" : "var(--negative)") : undefined}
          borderColor="var(--accent)" iconBg="var(--accent-dim)" iconColor="var(--accent)" />
        <KpiCard
          label="Draws Called" Icon={IconSlash}
          big={stats ? `${stats.drawCount} / ${stats.total}` : "—"}
          sub={stats?.drawCount ? `Avg draw prob ${(stats.avgDrawProb*100).toFixed(1)}%` : "No matches yet"}
          borderColor="var(--accent)" iconBg="var(--accent-dim)" iconColor="var(--accent)" />
        <KpiCard
          label="Biggest Upset" Icon={IconBolt}
          big={upsetT ? upsetT.team : "—"}
          sub={upsetT ? `won at ${(upsetT.prob*100).toFixed(1)}% odds` : "No matches yet"}
          borderColor="var(--negative)" iconBg="var(--negative-dim)" iconColor="var(--negative)" />
      </div>

      {/* Middle row */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, minHeight:0 }}>

        {/* Monte Carlo */}
        <div className="card" style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <div className="card-header">
            <span className="card-title">Tournament Odds</span>
            <Link href="/montecarlo" className="back-link">See all →</Link>
          </div>
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {simRanked.length === 0 ? (
              <div className="empty">Simulation unavailable</div>
            ) : simRanked.map(([team, p], i) => (
              <div key={team} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:16, fontSize:11, color:"var(--text-faint)", textAlign:"right", flexShrink:0 }}>{i+1}</span>
                <span style={{ flex:1, fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{team}</span>
                <div className="bar-track" style={{ flex:1.5 }}>
                  <div className="bar-fill" style={{ background: i < 3 ? "var(--accent)" : "var(--border)", width:`${(p.winner/maxWinner)*100}%` }} />
                </div>
                <span style={{ width:36, fontSize:13, fontWeight:600, color: i < 3 ? "var(--accent)" : "var(--text-faint)", textAlign:"right", flexShrink:0 }}>
                  {(p.winner*100).toFixed(1)}%
                </span>
                <span className="badge badge-accent" style={{ flexShrink:0 }}>F {(p.final*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* xG */}
        <div className="card" style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <div className="card-header">
            <span className="card-title">xG Performance</span>
            <Link href="/performance" className="back-link">See all →</Link>
          </div>
          {xgEntries.length === 0 ? (
            <div className="empty">No matches played yet</div>
          ) : (
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
              {xgOver.map(([team, delta]) => (
                <div key={team} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13 }}>{team}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--positive)" }}>+{delta.toFixed(1)}</span>
                </div>
              ))}
              {xgOver.length > 0 && xgUnder.length > 0 && <hr style={{ border:"none", borderTop:"1px solid var(--border)", margin:0 }} />}
              {xgUnder.map(([team, delta]) => (
                <div key={team} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13 }}>{team}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--negative)" }}>{delta.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, minHeight:0 }}>

        {/* Next matches */}
        <div className="card" style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <div className="card-header">
            <span className="card-title">Next Matches</span>
            <Link href="/upcoming" className="back-link">See all →</Link>
          </div>
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
            {upcoming.slice(0,3).map((f, idx) => {
              const maxP = Math.max(f.prediction.HOME_WIN, f.prediction.DRAW, f.prediction.AWAY_WIN);
              return (
                <div key={f.match_number} style={{
                  padding:"10px 0", borderBottom: idx < 2 ? "1px solid var(--border)" : "none",
                  display:"flex", flexDirection:"column", gap:4,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, fontWeight:500, color:"var(--foreground)" }}>
                      {f.home_team} <span style={{ color:"var(--text-faint)", fontWeight:400 }}>vs</span> {f.away_team}
                    </span>
                    <span style={{ fontSize:11, color:"var(--text-faint)", flexShrink:0, marginLeft:6 }}>
                      {f.group || "KO"}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--text-faint)" }}>{f.date}</div>
                  <div style={{ display:"flex", gap:4 }}>
                    {[
                      { label:`H ${(f.prediction.HOME_WIN*100).toFixed(0)}%`, val:f.prediction.HOME_WIN },
                      { label:`D ${(f.prediction.DRAW*100).toFixed(0)}%`, val:f.prediction.DRAW },
                      { label:`A ${(f.prediction.AWAY_WIN*100).toFixed(0)}%`, val:f.prediction.AWAY_WIN },
                    ].map((pill, pi) => (
                      <span key={pi} className="badge" style={{
                        background: pill.val === maxP ? "var(--accent-dim)" : "var(--bg-page)",
                        color: pill.val === maxP ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: pill.val === maxP ? 600 : 400,
                      }}>{pill.label}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {upcoming.length === 0 && <div className="empty">No upcoming fixtures</div>}
          </div>
        </div>

        {/* Upsets */}
        <div className="card" style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <div className="card-header">
            <span className="card-title">Biggest Upsets</span>
            <Link href="/upsets" className="back-link">See all →</Link>
          </div>
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
            {!stats || stats.upsets.length === 0 ? (
              <div className="empty">No matches played yet</div>
            ) : stats.upsets.slice(0,3).map((u, idx) => (
              <div key={idx} style={{
                padding:"10px 0",
                borderBottom: idx < 2 ? "1px solid var(--border)" : "none",
                display:"flex", flexDirection:"column", gap:4,
              }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{u.home} {u.score} {u.away}</span>
                <span className="badge" style={{ background:"var(--negative-dim)", color:"var(--negative)", alignSelf:"flex-start" }}>
                  won at {(u.prob*100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Group progress */}
        <div className="card" style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          <div className="card-header">
            <span className="card-title">Group Progress</span>
          </div>
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {gProgress.length === 0 ? (
              <div className="empty">No fixture data</div>
            ) : gProgress.map(([group, { played: p, total: t }]) => {
              const letter = group.replace("Group ", "");
              const pct    = t > 0 ? (p / t) * 100 : 0;
              return (
                <div key={group} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:14, fontSize:11, fontWeight:600, color:"var(--text-muted)", flexShrink:0 }}>{letter}</span>
                  <div className="bar-track" style={{ flex:1 }}>
                    <div className="bar-fill" style={{ background:"var(--accent)", width:`${pct}%` }} />
                  </div>
                  <span style={{ fontSize:11, color:"var(--text-faint)", flexShrink:0 }}>{p}/{t}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
