"use client";

import { useState } from "react";
import { AnimatedBar } from "../_components/AnimatedBar";

interface Prediction {
  HOME_WIN: number;
  DRAW: number;
  AWAY_WIN: number;
  home_elo: number;
  away_elo: number;
}

interface Fixture {
  match_number: number;
  date: string;
  location: string;
  home_team: string;
  away_team: string;
  group: string;
  result: string | null;
  prediction: Prediction;
}

// ── Standings calculation ─────────────────────────
// Played matches → actual pts. Upcoming → expected pts (HOME_WIN×3 + DRAW×1).
function computeStandings(allFixtures: Fixture[], group: string) {
  const pts  = new Map<string, number>();
  const played = new Map<string, number>();

  for (const f of allFixtures.filter((f) => f.group === group)) {
    if (!pts.has(f.home_team)) { pts.set(f.home_team, 0); played.set(f.home_team, 0); }
    if (!pts.has(f.away_team)) { pts.set(f.away_team, 0); played.set(f.away_team, 0); }

    if (f.result !== null) {
      const [hg, ag] = f.result.split("-").map((s) => parseInt(s.trim(), 10));
      played.set(f.home_team, played.get(f.home_team)! + 1);
      played.set(f.away_team, played.get(f.away_team)! + 1);
      if (hg > ag) {
        pts.set(f.home_team, pts.get(f.home_team)! + 3);
      } else if (ag > hg) {
        pts.set(f.away_team, pts.get(f.away_team)! + 3);
      } else {
        pts.set(f.home_team, pts.get(f.home_team)! + 1);
        pts.set(f.away_team, pts.get(f.away_team)! + 1);
      }
    } else {
      // Expected value from prediction
      pts.set(
        f.home_team,
        pts.get(f.home_team)! + f.prediction.HOME_WIN * 3 + f.prediction.DRAW
      );
      pts.set(
        f.away_team,
        pts.get(f.away_team)! + f.prediction.AWAY_WIN * 3 + f.prediction.DRAW
      );
    }
  }

  return Array.from(pts.entries())
    .map(([name, p]) => ({ name, pts: p, played: played.get(name) ?? 0 }))
    .sort((a, b) => b.pts - a.pts);
}

// ── Upset detection ───────────────────────────────
function isUpsetAlert(f: Fixture): boolean {
  const { home_elo, away_elo, HOME_WIN, AWAY_WIN } = f.prediction;
  const diff = Math.abs(home_elo - away_elo);
  if (diff < 80) return false; // competitive — not a true upset scenario
  const underdogWin = home_elo > away_elo ? AWAY_WIN : HOME_WIN;
  return underdogWin >= 0.28;
}

// ── Date helpers ──────────────────────────────────
function formatDateHeader(ddmmyyyy: string) {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return new Date(`${yyyy}-${mm}-${dd}`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ── Sub-components ────────────────────────────────

function GroupStandings({
  standings,
}: {
  standings: Array<{ name: string; pts: number; played: number }>;
}) {
  const maxPts = Math.max(...standings.map((s) => s.pts), 1);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{
          background: "rgba(0,0,0,0.45)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-faint)" }}
        >
          Projected Standings
        </span>
        <span className="text-xs" style={{ color: "var(--text-faint)", opacity: 0.5 }}>
          xPts
        </span>
      </div>

      {standings.map((t, i) => {
        const barW = (t.pts / maxPts) * 100;
        const qualifies = i < 2;
        const ptsDisplay =
          t.pts % 1 === 0 ? t.pts.toString() : t.pts.toFixed(1);

        return (
          <div
            key={t.name}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{
              borderBottom:
                i < standings.length - 1
                  ? "1px solid rgba(255,255,255,0.03)"
                  : undefined,
              background:
                i % 2 === 0 ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)",
            }}
          >
            {/* Rank */}
            <span
              className="text-xs font-bold w-4 text-center flex-shrink-0"
              style={{ color: qualifies ? "var(--accent)" : "var(--text-faint)" }}
            >
              {i + 1}
            </span>

            {/* Team */}
            <span
              className="text-sm font-semibold flex-1 min-w-0 truncate"
              style={{ color: qualifies ? "var(--foreground)" : "var(--text-muted)" }}
            >
              {t.name}
            </span>

            {/* Q2 qualifier dot */}
            {qualifies && (
              <span
                className="text-xs font-bold flex-shrink-0"
                style={{ color: "var(--accent)", opacity: 0.6 }}
                title="Projected qualifier"
              >
                Q
              </span>
            )}

            {/* Bar */}
            <div
              className="rounded-full overflow-hidden flex-shrink-0"
              style={{ width: 72, height: 3, background: "rgba(0,0,0,0.5)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${barW}%`,
                  background: qualifies ? "var(--accent)" : "var(--text-faint)",
                }}
              />
            </div>

            {/* Points */}
            <span
              className="text-xs font-bold font-mono w-7 text-right flex-shrink-0"
              style={{ color: qualifies ? "var(--accent)" : "var(--text-muted)" }}
            >
              {ptsDisplay}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MatchCard({ fixture }: { fixture: Fixture }) {
  const [, timePart] = fixture.date.split(" ");
  const upset = isUpsetAlert(fixture);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 grad-border card-lift"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(201,168,76,0.08)",
              color: "var(--accent)",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            {fixture.group}
          </span>
          {upset && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(249,115,22,0.1)",
                color: "#f97316",
                border: "1px solid rgba(249,115,22,0.25)",
              }}
            >
              Upset Alert
            </span>
          )}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-faint)" }}>
          {timePart} · {fixture.location.split(" ")[0]}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <span className="sport text-2xl flex-1" style={{ color: "var(--foreground)" }}>
          {fixture.home_team}
        </span>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-faint)" }}
        >
          vs
        </div>
        <span
          className="sport text-2xl flex-1 text-right"
          style={{ color: "var(--foreground)" }}
        >
          {fixture.away_team}
        </span>
      </div>

      {/* Probability bar */}
      <AnimatedBar
        homeWin={fixture.prediction.HOME_WIN}
        draw={fixture.prediction.DRAW}
        awayWin={fixture.prediction.AWAY_WIN}
        homeTeam={fixture.home_team}
        awayTeam={fixture.away_team}
      />

      {/* Elo */}
      <div className="flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
        <span>ELO {fixture.prediction.home_elo}</span>
        <span>ELO {fixture.prediction.away_elo}</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────

export function UpcomingClient({ fixtures }: { fixtures: Fixture[] }) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const upcoming = fixtures.filter((f) => f.result === null);

  // Unique groups with upcoming matches, sorted
  const groups = [...new Set(upcoming.map((f) => f.group))].sort((a, b) => {
    const letter = (g: string) => g.replace("Group ", "");
    return letter(a).localeCompare(letter(b));
  });

  const visibleGroups = activeGroup ? [activeGroup] : groups;

  return (
    <div className="flex flex-col gap-10">

      {/* ── Group filter ──────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGroup(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150"
          style={{
            background: activeGroup === null ? "var(--accent)" : "rgba(255,255,255,0.05)",
            color: activeGroup === null ? "#0a0a0a" : "var(--text-muted)",
            border: activeGroup === null ? "1px solid var(--accent)" : "1px solid var(--border)",
          }}
        >
          All
        </button>
        {groups.map((g) => {
          const active = activeGroup === g;
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(active ? null : g)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150"
              style={{
                background: active ? "var(--accent)" : "rgba(255,255,255,0.05)",
                color: active ? "#0a0a0a" : "var(--text-muted)",
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              {g.replace("Group ", "")}
            </button>
          );
        })}
      </div>

      {/* ── Group sections ────────────────────────── */}
      {visibleGroups.map((group) => {
        const standings = computeStandings(fixtures, group);
        const groupUpcoming = upcoming.filter((f) => f.group === group);

        // Sub-group by date within this group
        const byDate = new Map<string, Fixture[]>();
        for (const f of groupUpcoming) {
          const d = f.date.split(" ")[0];
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(f);
        }

        return (
          <div key={group} className="flex flex-col gap-5">
            {/* Group header */}
            <div className="flex items-center gap-4">
              <h2 className="sport text-3xl" style={{ color: "var(--accent)" }}>
                {group}
              </h2>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
                {groupUpcoming.length} match{groupUpcoming.length !== 1 ? "es" : ""} remaining
              </span>
            </div>

            {/* Standings */}
            <GroupStandings standings={standings} />

            {/* Matches by date */}
            {Array.from(byDate.entries()).map(([date, matches]) => (
              <div key={date} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <p
                    className="text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatDateHeader(date)}
                  </p>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {matches.map((f) => (
                    <MatchCard key={f.match_number} fixture={f} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {upcoming.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No upcoming matches found.</p>
      )}
    </div>
  );
}
