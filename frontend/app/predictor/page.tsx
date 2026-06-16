interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_elo: number; away_elo: number; }
interface Fixture { match_number: number; date: string; location: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction; }

const TIERS = [
  { label: "Elite",       min: 1950, color: "var(--accent)",        bg: "var(--accent-light)",  border: "var(--accent-dim)"  },
  { label: "Contender",   min: 1850, color: "#7c3aed",              bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.15)" },
  { label: "Strong",      min: 1750, color: "var(--text-muted)",    bg: "var(--bg-page)",        border: "var(--border)" },
  { label: "Competitive", min: 0,    color: "var(--text-faint)",    bg: "transparent",           border: "transparent" },
];

function getTier(elo: number) { return TIERS.find((t) => elo >= t.min) ?? TIERS[TIERS.length - 1]; }
function barColor(elo: number, max: number, min: number) {
  const r = (elo - min) / (max - min);
  if (r > 0.75) return "var(--accent)";
  if (r > 0.45) return "var(--text-faint)";
  return "var(--border)";
}

export default async function PredictorPage() {
  const res = await fetch("https://wc-project-production.up.railway.app/fixtures", { cache: "no-store" });
  const fixtures: Fixture[] = await res.json();

  const eloMap = new Map<string, number>();
  for (const f of fixtures) {
    if (!eloMap.has(f.home_team)) eloMap.set(f.home_team, f.prediction.home_elo);
    if (!eloMap.has(f.away_team)) eloMap.set(f.away_team, f.prediction.away_elo);
  }

  const teams = Array.from(eloMap.entries())
    .map(([name, elo]) => ({ name, elo }))
    .sort((a, b) => b.elo - a.elo);

  const maxElo = teams[0]?.elo ?? 2000;
  const minElo = teams[teams.length - 1]?.elo ?? 1500;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div>
        <h1 className="page-title">Power Rankings</h1>
        <p className="page-subtitle">{teams.length} teams ranked by Elo rating · pre-tournament snapshot</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TIERS.map(t => (
          <span key={t.label} className="badge" style={{ background:t.bg, color:t.color, border:`1px solid ${t.border}` }}>{t.label}</span>
        ))}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--border)" }}>
              <th className="table-header" style={{ width:32 }}>#</th>
              <th className="table-header">Team</th>
              <th className="table-header" style={{ width:80 }}>Tier</th>
              <th className="table-header" style={{ textAlign:"right", width:50 }}>Elo</th>
              <th style={{ width:80 }}></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => {
              const tier = getTier(team.elo);
              const bc = barColor(team.elo, maxElo, minElo);
              const top3 = i < 3;
              return (
                <tr key={team.name} className="table-row" style={{ borderBottom:"1px solid var(--border)" }}>
                  <td className="table-cell" style={{ color: top3 ? "var(--accent)" : "var(--text-faint)" }}>{i + 1}</td>
                  <td className="table-cell" style={{ fontWeight: top3 ? 600 : 500 }}>{team.name}</td>
                  <td className="table-cell">
                    <span className="badge" style={{ background:tier.bg, color:tier.color, border:`1px solid ${tier.border}` }}>{tier.label}</span>
                  </td>
                  <td className="table-cell" style={{ textAlign:"right", fontWeight:600, color:bc }}>{team.elo}</td>
                  <td className="table-cell">
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width:`${((team.elo - minElo) / (maxElo - minElo)) * 100}%`, background:bc }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
