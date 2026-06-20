import WinTypeDonut from "../_components/WinTypeDonut";
import UnpredictableGroups from "../_components/UnpredictableGroups";
import GroupCarousel from "./GroupCarousel";
import { parseScore } from "../_components/dateUtils";
import TournamentBadge from "../_components/TournamentBadge";
import { Fixture, BASE } from "../_components/types";

type StandingRow = { team: string; played: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number }

function computeStandings(fixtures: Fixture[], group: string): StandingRow[] {
  const stats: Record<string, { w: number; d: number; l: number; gf: number; ga: number }> = {};

  for (const f of fixtures.filter(f => f.group === group)) {
    if (!stats[f.home_team]) stats[f.home_team] = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    if (!stats[f.away_team]) stats[f.away_team] = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };

    if (!f.result) continue;
    const parsed = parseScore(f.result);
    if (!parsed) continue;
    const [hs, as_] = parsed;

    stats[f.home_team].gf += hs;
    stats[f.home_team].ga += as_;
    stats[f.away_team].gf += as_;
    stats[f.away_team].ga += hs;

    if (hs > as_)      { stats[f.home_team].w++; stats[f.away_team].l++; }
    else if (as_ > hs) { stats[f.away_team].w++; stats[f.home_team].l++; }
    else               { stats[f.home_team].d++;  stats[f.away_team].d++; }
  }

  return Object.entries(stats)
    .map(([team, s]) => ({
      team,
      played: s.w + s.d + s.l,
      w: s.w, d: s.d, l: s.l,
      gf: s.gf, ga: s.ga,
      gd: s.gf - s.ga,
      pts: s.w * 3 + s.d,
    }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}


export default async function GroupsPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()); } catch {}

  const groups = [...new Set(fixtures.filter(f => f.group).map(f => f.group))].sort();
  const played = fixtures.filter(f => f.result !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          Groups
        </h1>
        <TournamentBadge />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <WinTypeDonut played={played} />
        <UnpredictableGroups fixtures={fixtures} />
      </div>

      {/* Group standings carousel */}
      <GroupCarousel groups={groups.map(group => ({ group, rows: computeStandings(fixtures, group) }))} />
    </div>
  );
}
