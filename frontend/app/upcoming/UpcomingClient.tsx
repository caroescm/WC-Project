"use client";

import { useState } from "react";
import { AnimatedBar } from "../_components/AnimatedBar";
import { parseMatchDateUTC } from "../_components/dateUtils";

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

function computeStandings(allFixtures: Fixture[], group: string) {
  const pts   = new Map<string, number>();
  const played = new Map<string, number>();

  for (const f of allFixtures.filter((f) => f.group === group)) {
    if (!pts.has(f.home_team)) { pts.set(f.home_team, 0); played.set(f.home_team, 0); }
    if (!pts.has(f.away_team)) { pts.set(f.away_team, 0); played.set(f.away_team, 0); }

    if (f.result !== null) {
      const [hg, ag] = f.result.split("-").map((s) => parseInt(s.trim(), 10));
      played.set(f.home_team, played.get(f.home_team)! + 1);
      played.set(f.away_team, played.get(f.away_team)! + 1);
      if (hg > ag)       pts.set(f.home_team, pts.get(f.home_team)! + 3);
      else if (ag > hg)  pts.set(f.away_team, pts.get(f.away_team)! + 3);
      else {
        pts.set(f.home_team, pts.get(f.home_team)! + 1);
        pts.set(f.away_team, pts.get(f.away_team)! + 1);
      }
    } else if (f.prediction !== null) {
      pts.set(f.home_team, pts.get(f.home_team)! + f.prediction.HOME_WIN * 3 + f.prediction.DRAW);
      pts.set(f.away_team, pts.get(f.away_team)! + f.prediction.AWAY_WIN * 3 + f.prediction.DRAW);
    }
  }

  return Array.from(pts.entries())
    .map(([name, p]) => ({ name, pts: p, played: played.get(name) ?? 0 }))
    .sort((a, b) => b.pts - a.pts);
}

function isUpsetAlert(f: Fixture): boolean {
  if (!f.prediction) return false;
  const { home_elo, away_elo, HOME_WIN, AWAY_WIN } = f.prediction;
  const diff = Math.abs(home_elo - away_elo);
  if (diff < 80) return false;
  const underdogWin = home_elo > away_elo ? AWAY_WIN : HOME_WIN;
  return underdogWin >= 0.28;
}

function formatDateHeader(ddmmyyyy: string) {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, 12)).toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric",
  });
}

function GroupStandings({ standings }: { standings: Array<{ name: string; pts: number; played: number }> }) {
  const maxPts = Math.max(...standings.map((s) => s.pts), 1);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-page)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)" }}>Projected Standings</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)", opacity: 0.5 }}>xPts</span>
      </div>

      {standings.map((t, i) => {
        const qualifies = i < 2;
        const barW = (t.pts / maxPts) * 100;
        const ptsDisplay = t.pts % 1 === 0 ? t.pts.toString() : t.pts.toFixed(1);

        return (
          <div key={t.name} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
            borderBottom: i < standings.length - 1 ? "1px solid var(--border)" : undefined,
          }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, width: 16, textAlign: "center", flexShrink: 0, color: qualifies ? "var(--accent)" : "var(--text-faint)" }}>
              {i + 1}
            </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: qualifies ? "var(--foreground)" : "var(--text-muted)" }}>
              {t.name}
            </span>
            {qualifies && (
              <span style={{ fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, color: "var(--accent)", opacity: 0.6 }} title="Projected qualifier">
                Q
              </span>
            )}
            <div style={{ borderRadius: 9999, overflow: "hidden", flexShrink: 0, width: 72, height: 4, background: "var(--bg-page)" }}>
              <div style={{ height: "100%", borderRadius: 9999, width: `${barW}%`, background: qualifies ? "var(--accent)" : "var(--text-faint)" }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit", width: 28, textAlign: "right", flexShrink: 0, color: qualifies ? "var(--accent)" : "var(--text-muted)" }}>
              {ptsDisplay}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MatchCard({ fixture }: { fixture: Fixture }) {
  const timePart = parseMatchDateUTC(fixture.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const upset = isUpsetAlert(fixture);

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-accent">{fixture.group}</span>
          {upset && (
            <span className="badge" style={{ background: "var(--risk-dim)", color: "var(--risk)" }}>
              Upset Alert
            </span>
          )}
        </div>
        <span style={{ fontSize: "0.75rem", flexShrink: 0, color: "var(--text-faint)" }}>
          {timePart} · {fixture.location.split(" ")[0]}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="sport" style={{ fontSize: "1.5rem", flex: 1, color: "var(--foreground)" }}>
          {fixture.home_team}
        </span>
        <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600, background: "var(--bg-page)", color: "var(--text-faint)" }}>
          vs
        </div>
        <span className="sport" style={{ fontSize: "1.5rem", flex: 1, textAlign: "right", color: "var(--foreground)" }}>
          {fixture.away_team}
        </span>
      </div>

      {fixture.prediction && (
        <>
          <AnimatedBar
            homeWin={fixture.prediction.HOME_WIN}
            draw={fixture.prediction.DRAW}
            awayWin={fixture.prediction.AWAY_WIN}
            homeTeam={fixture.home_team}
            awayTeam={fixture.away_team}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-faint)" }}>
            <span>ELO {fixture.prediction.home_elo}</span>
            <span>ELO {fixture.prediction.away_elo}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function UpcomingClient({ fixtures }: { fixtures: Fixture[] }) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const upcoming = fixtures.filter((f) => f.result === null);

  const groups = [...new Set(upcoming.map((f) => f.group))].sort((a, b) => {
    const letter = (g: string) => g.replace("Group ", "");
    return letter(a).localeCompare(letter(b));
  });

  const visibleGroups = activeGroup ? [activeGroup] : groups;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

      {/* Group filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          onClick={() => setActiveGroup(null)}
          style={{
            padding: "6px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
            background: activeGroup === null ? "var(--accent)" : "var(--bg-page)",
            color: activeGroup === null ? "#ffffff" : "var(--text-muted)",
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
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
                background: active ? "var(--accent)" : "var(--bg-page)",
                color: active ? "#ffffff" : "var(--text-muted)",
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              {g.replace("Group ", "")}
            </button>
          );
        })}
      </div>

      {/* Group sections */}
      {visibleGroups.map((group) => {
        const standings = computeStandings(fixtures, group);
        const groupUpcoming = upcoming.filter((f) => f.group === group);

        const byDate = new Map<string, Fixture[]>();
        for (const f of groupUpcoming) {
          const d = f.date.split(" ")[0];
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(f);
        }

        return (
          <div key={group} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Group heading */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h2 className="sport" style={{ fontSize: "1.875rem", color: "var(--accent)" }}>
                {group}
              </h2>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                {groupUpcoming.length} match{groupUpcoming.length !== 1 ? "es" : ""} remaining
              </span>
            </div>

            <GroupStandings standings={standings} />

            {Array.from(byDate.entries()).map(([date, matches]) => (
              <div key={date} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {formatDateHeader(date)}
                  </p>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
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
        <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>No upcoming matches found.</p>
      )}
    </div>
  );
}
