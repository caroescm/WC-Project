import WinTypeDonut from "../_components/WinTypeDonut";
import UnpredictableGroups from "../_components/UnpredictableGroups";

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_xg: number; away_xg: number }
interface Fixture { match_number: number; date: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";

function parseScore(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [+m[1], +m[2]] : null;
}

interface StandingRow { team: string; played: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number }

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

function GroupTable({ group, rows }: { group: string; rows: StandingRow[] }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: "#1a1628", borderRadius: 0 }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.04em" }}>{group}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Team", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts"].map((h, i) => (
              <th key={h} style={{
                padding: "8px 10px", fontSize: "0.5625rem", fontWeight: 700,
                color: "var(--text-faint)", textAlign: i === 0 ? "left" : "center",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const qualifies = i < 2;
            return (
              <tr key={r.team} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "9px 10px", fontSize: "0.8125rem", fontWeight: qualifies ? 600 : 400, color: qualifies ? "var(--foreground)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  {qualifies && <span style={{ width: 3, height: 14, background: "var(--accent)", borderRadius: 0, flexShrink: 0 }} />}
                  {r.team}
                </td>
                {[r.played, r.w, r.d, r.l, r.gf, r.ga, r.gd > 0 ? `+${r.gd}` : r.gd].map((v, j) => (
                  <td key={j} style={{ padding: "9px 10px", fontSize: "0.8125rem", textAlign: "center", color: j === 6 ? (r.gd > 0 ? "var(--positive)" : r.gd < 0 ? "var(--negative)" : "var(--text-faint)") : "var(--text-faint)", fontVariantNumeric: "tabular-nums" }}>
                    {v}
                  </td>
                ))}
                <td style={{ padding: "9px 10px", fontSize: "0.875rem", fontWeight: 700, textAlign: "center", color: qualifies ? "var(--accent)" : "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", color: "var(--text-muted)", background: "#fff", border: "1px solid var(--border)", borderRadius: 0, padding: "6px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 6.5H15" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M11 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>June 11 – July 19</span>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <WinTypeDonut played={played} />
        <UnpredictableGroups fixtures={fixtures} />
      </div>

      {/* Group standings */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Group Standings
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {groups.map(group => (
            <GroupTable key={group} group={group} rows={computeStandings(fixtures, group)} />
          ))}
        </div>
      </div>
    </div>
  );
}
