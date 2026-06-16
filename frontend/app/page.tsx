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

/* ─── Dashboard ─────────────────────────────── */

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

  const simRanked = Object.entries(simulation).sort(([,a],[,b]) => b.winner - a.winner);
  const maxWinner = simRanked[0]?.[1].winner ?? 1;
  const [topTeam, topEntry] = simRanked[0] ?? ["—", null];

  const xgEntries = stats ? Object.entries(stats.xgDelta).sort(([,a],[,b]) => b - a) : [];
  const xgOver    = xgEntries[0] ?? null;
  const xgUnder   = xgEntries.length > 0 ? xgEntries[xgEntries.length - 1] : null;

  const gProgress = groupProgress(fixtures);

  const upsetT  = stats?.upsets[0];

  // Per-match correct/incorrect log for the accuracy chart
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

  // Hero narrative — the model's single strongest conclusion right now
  const heroConclusion =
    simRanked.length === 0 ? "Simulation loading"
    : topEntry!.winner > 0.20 ? `${topTeam} is the clear favorite`
    : topEntry!.winner > 0.12 ? `${topTeam} leads a crowded field`
    : `No clear favorite — ${topTeam} edges ahead`;

  const heroDetail =
    simRanked.length === 0 ? "Tournament odds will appear once the simulation is available." :
    stats
      ? `Monte Carlo simulation across 3,000 trials gives ${topTeam} a ${(topEntry!.winner * 100).toFixed(1)}% chance of lifting the trophy — the highest of any team. The model has called ${stats.correct} of ${stats.total} matches correctly (${(stats.correct / stats.total * 100).toFixed(0)}%).`
      : `Monte Carlo simulation across 3,000 trials gives ${topTeam} a ${(topEntry!.winner * 100).toFixed(1)}% chance of lifting the trophy. Pre-tournament snapshot — accuracy updates as results come in.`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── 1. HERO INSIGHT ──────────────────────────────────────────
          The model's single strongest conclusion. Leads with a verdict,
          not a metric. Supporting numbers live on the right. */}
      <div className="card" style={{ padding:"28px 32px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:32 }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12, minWidth:0 }}>
          <span style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--text-faint)", letterSpacing:"0.07em", textTransform:"uppercase" }}>
            Model Conclusion
          </span>
          <h1 className="sport" style={{ fontSize:"2rem", lineHeight:1.1, margin:0 }}>
            {heroConclusion}
          </h1>
          <p style={{ fontSize:"0.875rem", color:"var(--text-muted)", lineHeight:1.7, margin:0, maxWidth:560 }}>
            {heroDetail}
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0, alignItems:"flex-end" }}>
          {topEntry && (
            <div style={{ textAlign:"right" }}>
              <div className="sport" style={{ fontSize:"2.25rem", color:"var(--accent)", lineHeight:1 }}>
                {(topEntry.winner * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:2 }}>
                {topTeam} to win
              </div>
            </div>
          )}
          {stats && (
            <div style={{ textAlign:"right", paddingTop:8, borderTop:"1px solid var(--border)" }}>
              <div className="sport" style={{ fontSize:"1.375rem", lineHeight:1 }}>
                {(stats.correct / stats.total * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:2 }}>
                model accuracy
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. TOURNAMENT OUTLOOK ──────────────────────────────────
          Who has a realistic path to the trophy. Full-width so the
          relative gaps between teams read clearly at a glance. */}
      <div>
        <SectionLabel text="Tournament Outlook" href="/montecarlo" linkLabel="Full simulation →" />
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          {simRanked.length === 0 ? (
            <div className="empty">Simulation unavailable</div>
          ) : simRanked.slice(0, 8).map(([team, p], i) => {
            const isTop = i < 3;
            const barPct = (p.winner / maxWinner) * 100;
            return (
              <div key={team} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 20px",
                borderBottom: i < 7 ? "1px solid var(--border)" : "none",
                background: i === 0 ? "var(--accent-dim)" : "transparent",
              }}>
                <span style={{ width:18, fontSize:"0.6875rem", fontWeight:600, color:"var(--text-faint)", flexShrink:0, textAlign:"right" }}>
                  {i + 1}
                </span>
                <span style={{ width:180, fontSize:"0.875rem", fontWeight: isTop ? 600 : 500, color: isTop ? "var(--foreground)" : "var(--text-muted)", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {team}
                </span>
                <div className="bar-track" style={{ flex:1 }}>
                  <div className="bar-fill" style={{ width:`${barPct}%`, background: isTop ? "var(--accent)" : "var(--border)" }} />
                </div>
                <span style={{ width:48, fontSize:"0.875rem", fontWeight:700, color: isTop ? "var(--accent)" : "var(--text-faint)", textAlign:"right", flexShrink:0 }}>
                  {(p.winner * 100).toFixed(1)}%
                </span>
                <span style={{ width:56, fontSize:"0.75rem", color:"var(--text-faint)", textAlign:"right", flexShrink:0 }}>
                  F {(p.final * 100).toFixed(0)}%
                </span>
                <span style={{ width:56, fontSize:"0.75rem", color:"var(--text-faint)", textAlign:"right", flexShrink:0 }}>
                  SF {(p.sf * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. KEY CHANGES + UPCOMING MATCHES ────────────────────
          Key Changes: where the model is being surprised (xG delta).
          Upcoming: what the model expects next. Side by side because
          together they answer "what's happened?" and "what's next?" */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:20 }}>

        {/* Key Changes */}
        <div>
          <SectionLabel text="Key Changes" href="/performance" linkLabel="Full xG report →" />
          <div className="card" style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {xgEntries.length === 0 ? (
              <div>
                <p style={{ fontSize:"0.8125rem", color:"var(--text-muted)", lineHeight:1.6, margin:0 }}>
                  No matches played yet. Check back after the opening round to see which teams are outperforming the model.
                </p>
              </div>
            ) : (
              <>
                {xgOver && (
                  <div>
                    <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--positive)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:6 }}>
                      Outperforming
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                      <span style={{ fontSize:"0.9375rem", fontWeight:600 }}>{xgOver[0]}</span>
                      <span style={{ fontSize:"1.125rem", fontWeight:700, color:"var(--positive)" }}>
                        +{xgOver[1].toFixed(1)} goals
                      </span>
                    </div>
                    <p style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:4, lineHeight:1.5 }}>
                      Scoring {xgOver[1].toFixed(1)} more than the model expects — form may be stronger than rated.
                    </p>
                  </div>
                )}
                <div style={{ height:1, background:"var(--border)" }} />
                {xgUnder && (
                  <div>
                    <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--negative)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:6 }}>
                      Underperforming
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                      <span style={{ fontSize:"0.9375rem", fontWeight:600 }}>{xgUnder[0]}</span>
                      <span style={{ fontSize:"1.125rem", fontWeight:700, color:"var(--negative)" }}>
                        {xgUnder[1].toFixed(1)} goals
                      </span>
                    </div>
                    <p style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:4, lineHeight:1.5 }}>
                      Scoring {Math.abs(xgUnder[1]).toFixed(1)} fewer than expected — model may be over-rating this team.
                    </p>
                  </div>
                )}
                {upsetT && (
                  <>
                    <div style={{ height:1, background:"var(--border)" }} />
                    <div>
                      <div style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--text-faint)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:6 }}>
                        Biggest Upset
                      </div>
                      <div style={{ fontSize:"0.875rem", fontWeight:500 }}>{upsetT.home} {upsetT.score} {upsetT.away}</div>
                      <span className="badge" style={{ background:"var(--negative-dim)", color:"var(--negative)", marginTop:6, display:"inline-block" }}>
                        winner at {(upsetT.prob * 100).toFixed(1)}% odds
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Upcoming Matches */}
        <div>
          <SectionLabel text="Upcoming" href="/upcoming" linkLabel="All fixtures →" />
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            {upcoming.length === 0 ? (
              <div className="empty">No upcoming fixtures</div>
            ) : upcoming.slice(0, 5).map((f, idx) => {
              const maxP = Math.max(f.prediction.HOME_WIN, f.prediction.DRAW, f.prediction.AWAY_WIN);
              const isLast = idx === Math.min(upcoming.length, 5) - 1;
              return (
                <div key={f.match_number} style={{
                  padding:"14px 20px",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                  display:"flex", alignItems:"center", gap:16,
                }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0, width:36 }}>
                    <span style={{ fontSize:"0.6875rem", fontWeight:600, color:"var(--text-faint)" }}>{f.group || "KO"}</span>
                    <span style={{ fontSize:"0.6875rem", color:"var(--text-faint)" }}>{f.date.split(" ")[0]}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.875rem", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {f.home_team} <span style={{ color:"var(--text-faint)", fontWeight:400 }}>vs</span> {f.away_team}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                    {[
                      { label:`H ${(f.prediction.HOME_WIN*100).toFixed(0)}%`, val:f.prediction.HOME_WIN },
                      { label:`D ${(f.prediction.DRAW*100).toFixed(0)}%`,    val:f.prediction.DRAW },
                      { label:`A ${(f.prediction.AWAY_WIN*100).toFixed(0)}%`, val:f.prediction.AWAY_WIN },
                    ].map((pill, pi) => (
                      <span key={pi} className="badge" style={{
                        background: pill.val === maxP ? "var(--accent-dim)" : "var(--bg-page)",
                        color: pill.val === maxP ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: pill.val === maxP ? 600 : 400,
                      }}>
                        {pill.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. MODEL PERFORMANCE ─────────────────────────────────
          Running accuracy across every match played. Each dot is one
          match — green = correct call, red = wrong. Line shows trend. */}
      <div>
        <SectionLabel text="Prediction Accuracy" href="/accuracy" linkLabel="Full report →" />
        <div className="card">
          {matchLog.length === 0 ? (
            <div className="empty">No matches played yet — chart updates after each result.</div>
          ) : (() => {
            // SVG dimensions
            const W = 540, H = 90;
            const PAD = { t: 14, r: 16, b: 18, l: 36 };
            const cW = W - PAD.l - PAD.r;
            const cH = H - PAD.t - PAD.b;
            const n = matchLog.length;

            // Compute running accuracy and SVG coords per match
            let runCorrect = 0;
            const pts = matchLog.map(({ ok }, i) => {
              if (ok) runCorrect++;
              const acc = runCorrect / (i + 1);
              const x = PAD.l + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
              const y = PAD.t + (1 - acc) * cH;
              return { x, y, ok, acc };
            });

            const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

            // Y-axis reference levels
            const refs = [
              { pct: 1.0, label: "100%" },
              { pct: 0.5, label:  "50%" },
              { pct: 0.0, label:   "0%" },
            ];

            const finalAcc = pts[pts.length - 1].acc;

            return (
              <div style={{ display:"flex", alignItems:"flex-start", gap:24 }}>
                {/* Headline stat */}
                <div style={{ flexShrink:0, paddingTop:4 }}>
                  <div className="sport" style={{ fontSize:"2rem", lineHeight:1, color:"var(--accent)" }}>
                    {(finalAcc * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize:"0.75rem", color:"var(--text-faint)", marginTop:4 }}>
                    {stats!.correct} / {stats!.total} correct
                  </div>
                </div>

                {/* Chart */}
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height: H, display:"block", overflow:"visible" }}>
                  {/* Grid lines */}
                  {refs.map(({ pct, label }) => {
                    const y = PAD.t + (1 - pct) * cH;
                    return (
                      <g key={label}>
                        <line
                          x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y}
                          stroke="var(--border)" strokeWidth="1"
                          strokeDasharray={pct === 0.5 ? "3 3" : undefined}
                        />
                        <text x={PAD.l - 6} y={y + 4} textAnchor="end"
                          style={{ fontSize:9, fill:"var(--text-faint)", fontFamily:"monospace" }}>
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Accuracy line */}
                  {n > 1 && (
                    <polyline
                      points={polyline}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      opacity="0.5"
                    />
                  )}

                  {/* Match dots */}
                  {pts.map(({ x, y, ok }, i) => (
                    <circle
                      key={i}
                      cx={x.toFixed(1)} cy={y.toFixed(1)} r="4"
                      fill={ok ? "var(--positive)" : "var(--negative)"}
                      stroke="#ffffff" strokeWidth="1.5"
                    />
                  ))}

                  {/* Match index labels on x-axis */}
                  <text x={PAD.l} y={H - 2} textAnchor="middle"
                    style={{ fontSize:9, fill:"var(--text-faint)" }}>1</text>
                  {n > 1 && (
                    <text x={PAD.l + cW} y={H - 2} textAnchor="middle"
                      style={{ fontSize:9, fill:"var(--text-faint)" }}>{n}</text>
                  )}
                </svg>

                {/* Legend */}
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
            );
          })()}
        </div>
      </div>

      {/* ── 5. GROUP ANALYSIS ────────────────────────────────────
          Tournament stage context — useful for tracking, not for
          decision-making. Compact and at the bottom. */}
      <div>
        <SectionLabel text="Group Progress" />
        <div className="card">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"8px 32px" }}>
            {gProgress.length === 0 ? (
              <div className="empty" style={{ gridColumn:"1 / -1" }}>No fixture data</div>
            ) : gProgress.map(([group, { played: p, total: t }]) => {
              const letter = group.replace("Group ", "");
              const pct    = t > 0 ? (p / t) * 100 : 0;
              const done   = p === t;
              return (
                <div key={group} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:14, fontSize:"0.6875rem", fontWeight:700, color: done ? "var(--positive)" : "var(--text-muted)", flexShrink:0 }}>
                    {letter}
                  </span>
                  <div className="bar-track" style={{ flex:1 }}>
                    <div className="bar-fill" style={{ background: done ? "var(--positive)" : "var(--accent)", width:`${pct}%` }} />
                  </div>
                  <span style={{ fontSize:"0.6875rem", color:"var(--text-faint)", flexShrink:0, width:24, textAlign:"right" }}>
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
