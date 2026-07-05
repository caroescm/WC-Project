"use client";

import { useMemo, useState } from "react";
import { Fixture } from "../_components/types";
import { parseScore, bestOutcomeKey, actualOutcomeKey } from "../_components/dateUtils";

// Match-number ranges per stage (group stage is matches 1–72)
const STAGES = [
  { key: "group", label: "Group Stage",    short: "GRP", lo: 1,   hi: 72,  isGroup: true },
  { key: "r32",   label: "Round of 32",    short: "R32", lo: 73,  hi: 88,  isGroup: false },
  { key: "r16",   label: "Round of 16",    short: "R16", lo: 89,  hi: 96,  isGroup: false },
  { key: "qf",    label: "Quarter-finals", short: "QF",  lo: 97,  hi: 100, isGroup: false },
  { key: "sf",    label: "Semi-finals",    short: "SF",  lo: 101, hi: 102, isGroup: false },
  { key: "final", label: "Final",          short: "F",   lo: 103, hi: 104, isGroup: false },
] as const;

type StageKey = typeof STAGES[number]["key"];

const K_WORLD_CUP = 60; // mirrors src/config.py K_FACTORS["WORLD_CUP"]

// Elo delta for the home team, replicating src/elo.py update_elo
function eloDeltas(homeElo: number, awayElo: number, hs: number, as_: number) {
  const expHome = 1 / (1 + 10 ** ((awayElo - homeElo) / 400));
  const expAway = 1 / (1 + 10 ** ((homeElo - awayElo) / 400));
  const mov = Math.log(Math.abs(hs - as_) + 1);
  const actHome = hs > as_ ? 1 : hs < as_ ? 0 : 0.5;
  const actAway = as_ > hs ? 1 : as_ < hs ? 0 : 0.5;
  return {
    home: K_WORLD_CUP * mov * (actHome - expHome),
    away: K_WORLD_CUP * mov * (actAway - expAway),
  };
}

interface MatchFinding {
  matchNumber: number;
  home: string;
  away: string;
  hs: number;
  as_: number;
  pH: number; pD: number; pA: number;       // predicted probabilities (0–1)
  actualKey: "HOME_WIN" | "DRAW" | "AWAY_WIN";
  correct: boolean;
  surprise: number;                          // 1 − P(actual outcome): higher = bigger upset
  winner: string | null;                     // null if drawn scoreline (penalties, unknown)
  homeXg: number; awayXg: number;
  homeXgDiff: number; awayXgDiff: number;     // actual − xG
  homeEloDelta: number; awayEloDelta: number;
}

function buildFindings(fixtures: Fixture[], lo: number, hi: number) {
  const inStage = fixtures.filter(f => f.match_number >= lo && f.match_number <= hi);
  const played: MatchFinding[] = [];

  for (const f of inStage) {
    if (!f.result || !f.prediction) continue;
    const parsed = parseScore(f.result);
    if (!parsed) continue;
    const [hs, as_] = parsed;
    const p = f.prediction;
    const actualKey = actualOutcomeKey(hs, as_, f.penalties);
    const probOfActual = actualKey === "HOME_WIN" ? p.HOME_WIN : actualKey === "AWAY_WIN" ? p.AWAY_WIN : p.DRAW;
    const elo = eloDeltas(p.home_elo ?? 1500, p.away_elo ?? 1500, hs, as_);

    played.push({
      matchNumber: f.match_number,
      home: f.home_team,
      away: f.away_team,
      hs, as_,
      pH: p.HOME_WIN, pD: p.DRAW, pA: p.AWAY_WIN,
      actualKey,
      correct: bestOutcomeKey(p) === actualKey,
      surprise: 1 - probOfActual,
      winner: actualKey === "HOME_WIN" ? f.home_team : actualKey === "AWAY_WIN" ? f.away_team : null,
      homeXg: p.home_xg, awayXg: p.away_xg,
      homeXgDiff: hs - p.home_xg,
      awayXgDiff: as_ - p.away_xg,
      homeEloDelta: elo.home,
      awayEloDelta: elo.away,
    });
  }

  return { scheduled: inStage.length, played };
}

interface TeamPerf {
  team: string;
  goals: number;
  xg: number;
  diff: number;                 // actual − xG (aggregated over the team's matches this stage)
  passed: boolean | null;       // advanced? null = undecided (penalties)
}

const PALE = {
  accent: "var(--accent)",
  pos: "var(--positive)",
  neg: "var(--negative)",
};

function FindingCard({ label, title, detail, color }: { label: string; title: string; detail: string; color?: string }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", padding: "7px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: color ?? "var(--foreground)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{title}</span>
      <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{detail}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: "var(--card-bg)", padding: "8px 14px 10px", display: "flex", flexDirection: "column", minHeight: 70 }}>
      <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "1.375rem", fontWeight: 400, color: color ?? "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)", marginTop: "auto", paddingTop: 6 }}>{sub}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: "4px 0 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {children}
    </h3>
  );
}

export default function StagesClient({ fixtures }: { fixtures: Fixture[] }) {
  const [active, setActive] = useState<StageKey>("group");

  const stage = STAGES.find(s => s.key === active)!;
  const { scheduled, played } = useMemo(
    () => buildFindings(fixtures, stage.lo, stage.hi),
    [fixtures, stage.lo, stage.hi]
  );

  // A team advanced if it actually appears in a later-round fixture. This is the
  // ground truth from the draw — it correctly captures best-third qualifiers and
  // penalty-shootout winners, which standings/scoreline logic would miss.
  const nextRound = useMemo(() => {
    const teams = new Set<string>();
    for (const f of fixtures) {
      if (f.match_number > stage.hi) { teams.add(f.home_team); teams.add(f.away_team); }
    }
    return teams;
  }, [fixtures, stage.hi]);

  const total = played.length;
  const correct = played.filter(m => m.correct).length;
  const accPct = total ? (correct / total * 100).toFixed(0) : null;
  const upsets = [...played].filter(m => !m.correct).sort((a, b) => b.surprise - a.surprise);
  const advancers = played.map(m => m.winner).filter((w): w is string => !!w);
  const undecided = played.filter(m => !m.winner).length;

  // Per-team goals-vs-xG performance over this stage, plus whether the team advanced.
  const teamPerf = useMemo<TeamPerf[]>(() => {
    const agg: Record<string, { goals: number; xg: number }> = {};
    for (const m of played) {
      agg[m.home] ??= { goals: 0, xg: 0 }; agg[m.home].goals += m.hs; agg[m.home].xg += m.homeXg;
      agg[m.away] ??= { goals: 0, xg: 0 }; agg[m.away].goals += m.as_; agg[m.away].xg += m.awayXg;
    }

    const stageTeams = Object.keys(agg);
    // Only trust "did not advance" once the next round's teams are drawn (i.e. some
    // team from this stage already shows up there). Until then, advancement is unknown.
    const drawKnown = stageTeams.some(t => nextRound.has(t));
    const passedOf = (team: string): boolean | null =>
      nextRound.has(team) ? true : drawKnown ? false : null;

    return stageTeams
      .map(team => {
        const s = agg[team];
        return { team, goals: s.goals, xg: s.xg, diff: s.goals - s.xg, passed: passedOf(team) };
      })
      .sort((a, b) => b.diff - a.diff);
  }, [played, nextRound]);

  // Diverging chart: most extreme over/under-performers on each side.
  const over = teamPerf.filter(t => t.diff > 0.05);
  const under = teamPerf.filter(t => t.diff < -0.05);
  const chart = [...over.slice(0, 6), ...under.slice(-6)];
  const maxAbs = Math.max(0.5, ...chart.map(t => Math.abs(t.diff)));

  // Key findings
  const outNoPass = over.find(t => t.passed === false);                                  // outperformed but eliminated
  const underPass = [...teamPerf].filter(t => t.passed === true && t.diff < 0)
    .sort((a, b) => a.diff - b.diff)[0];                                                  // underperformed yet advanced
  const bestMatch = [...played].sort(
    (a, b) => Math.min(b.hs, b.as_) - Math.min(a.hs, a.as_) || (b.hs + b.as_) - (a.hs + a.as_)
  )[0];                                                                                   // most end-to-end
  const leastPredictable = [...played].sort((a, b) => b.surprise - a.surprise)[0];        // biggest surprise

  // Biggest Elo movers across both sides of every match
  const movers = played
    .flatMap(m => [
      { team: m.home, delta: m.homeEloDelta, matchNumber: m.matchNumber },
      { team: m.away, delta: m.awayEloDelta, matchNumber: m.matchNumber },
    ])
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  const avgXgDiff = total
    ? (played.reduce((s, m) => s + m.homeXgDiff + m.awayXgDiff, 0) / (total * 2)).toFixed(2)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Stage tabs */}
      <div style={{ display: "flex", background: "var(--toggle-track)", padding: 3, gap: 2, alignSelf: "flex-start" }}>
        {STAGES.map(s => {
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              style={{
                padding: "5px 12px", fontSize: "0.6875rem", fontWeight: 600,
                border: "none", borderRadius: 0, cursor: "pointer",
                background: isActive ? "#2E8B57" : "transparent",
                color: isActive ? "#fff" : "var(--toggle-inactive)",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {total === 0 ? (
        <div style={{ background: "var(--card-bg-alt)", border: "1px dashed var(--border)", padding: "28px 18px", textAlign: "center" }}>
          <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-muted)" }}>
            {scheduled === 0 ? `${stage.label} not drawn yet` : `${stage.label} not played yet`}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: 6 }}>
            Findings appear automatically once these matches are completed.
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <StatCard label="Stage Accuracy" value={accPct ? `${accPct}%` : "—"} sub={`${correct} of ${total} correct`} color={PALE.accent} />
            <StatCard label="Upsets" value={`${upsets.length}`} sub={upsets.length ? "favorite lost" : "all favorites held"} color={upsets.length ? PALE.neg : "var(--foreground)"} />
            <StatCard label="Avg Goals vs xG" value={avgXgDiff !== null ? `${+avgXgDiff >= 0 ? "+" : ""}${avgXgDiff}` : "—"} sub={+(avgXgDiff ?? 0) >= 0 ? "over-performed model" : "under-performed model"} color={avgXgDiff !== null ? (+avgXgDiff >= 0 ? PALE.pos : PALE.neg) : undefined} />
          </div>

          {/* Performance vs expected goals: diverging graph + key findings */}
          <SectionTitle>Performance vs Expected Goals</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(220px, 1fr)", gap: 16, alignItems: "stretch" }}>

            {/* Diverging bar chart */}
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <span style={{ color: "var(--negative)" }}>◂ Under-performed xG</span>
                <span style={{ color: "var(--positive)" }}>Over-performed xG ▸</span>
              </div>
              {chart.length === 0 ? (
                <p style={{ margin: "6px 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>Every team finished level with its expected goals.</p>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 4, minHeight: 0 }}>
                  {chart.map(t => {
                    const pct = `${(Math.abs(t.diff) / maxAbs) * 100}%`;
                    const pos = t.diff >= 0;
                    return (
                      <div key={t.team} style={{ display: "grid", gridTemplateColumns: "104px 1fr 1fr 46px", alignItems: "center", gap: 8, fontSize: "0.75rem" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground)", fontWeight: 600 }} title={t.team}>{t.team}</span>
                        <div style={{ position: "relative", height: 15, borderRight: "1px solid var(--border)" }}>
                          {!pos && <div style={{ position: "absolute", right: 0, top: 0, height: "100%", width: pct, background: "var(--negative)", opacity: 0.85 }} />}
                        </div>
                        <div style={{ position: "relative", height: 15 }}>
                          {pos && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: pct, background: "var(--positive)", opacity: 0.85 }} />}
                        </div>
                        <span style={{ textAlign: pos ? "right" : "left", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: pos ? "var(--positive)" : "var(--negative)" }}>
                          {pos ? "+" : ""}{t.diff.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <span style={{ fontSize: "0.625rem", color: "var(--text-faint)", marginTop: "auto", paddingTop: 6 }}>Goals scored minus expected goals, summed over the stage.</span>
            </div>

            {/* Key findings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {outNoPass && (
                <FindingCard
                  label={stage.isGroup ? "Overperformed · went out" : "Overperformed · eliminated"}
                  title={outNoPass.team}
                  detail={`+${outNoPass.diff.toFixed(1)} goals vs xG but ${stage.isGroup ? "missed qualification" : "knocked out"}`}
                  color={PALE.pos}
                />
              )}
              {underPass && (
                <FindingCard
                  label={stage.isGroup ? "Underperformed · advanced" : "Underperformed · survived"}
                  title={underPass.team}
                  detail={`${underPass.diff.toFixed(1)} goals vs xG yet ${stage.isGroup ? "qualified" : "went through"}`}
                  color={PALE.neg}
                />
              )}
              {bestMatch && (
                <FindingCard
                  label="Best Match"
                  title={`${bestMatch.home} ${bestMatch.hs}–${bestMatch.as_} ${bestMatch.away}`}
                  detail="Most end-to-end tie of the stage"
                  color={PALE.accent}
                />
              )}
              {leastPredictable && (
                <FindingCard
                  label="Least Predictable"
                  title={`${leastPredictable.home} ${leastPredictable.hs}–${leastPredictable.as_} ${leastPredictable.away}`}
                  detail={`${(leastPredictable.surprise * 100).toFixed(0)}% surprise — lowest modelled chance`}
                />
              )}
              {movers.length > 0 && (
                <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Biggest Elo Swings</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {movers.map((mv, i) => (
                      <span key={`${mv.team}-${i}`} style={{
                        fontSize: "0.6875rem", fontWeight: 600, padding: "4px 9px",
                        background: "var(--card-bg-alt)", border: "1px solid var(--border)",
                        color: mv.delta >= 0 ? "var(--positive)" : "var(--negative)",
                      }}>
                        {mv.team} {mv.delta >= 0 ? "+" : ""}{Math.round(mv.delta)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advancers (single-elimination only — group qualification is standings-based) */}
          {!stage.isGroup && (
            <>
              <SectionTitle>Advanced to Next Round</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {advancers.map(t => (
                  <span key={t} style={{ fontSize: "0.8125rem", fontWeight: 700, padding: "5px 12px", background: "var(--accent-light)", color: "var(--accent)" }}>{t}</span>
                ))}
                {undecided > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", alignSelf: "center" }}>
                    · {undecided} decided on penalties (winner not in data)
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
