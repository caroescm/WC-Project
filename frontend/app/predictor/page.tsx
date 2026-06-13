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

interface TeamEntry {
  name: string;
  elo: number;
}

export default async function PredictorPage() {
  const res = await fetch("http://localhost:8000/fixtures", { cache: "no-store" });
  const fixtures: Fixture[] = await res.json();

  const eloMap = new Map<string, number>();
  for (const f of fixtures) {
    if (!eloMap.has(f.home_team)) eloMap.set(f.home_team, f.prediction.home_elo);
    if (!eloMap.has(f.away_team)) eloMap.set(f.away_team, f.prediction.away_elo);
  }

  const teams: TeamEntry[] = Array.from(eloMap.entries())
    .map(([name, elo]) => ({ name, elo }))
    .sort((a, b) => b.elo - a.elo);

  const maxElo = teams[0]?.elo ?? 1;
  const minElo = teams[teams.length - 1]?.elo ?? 0;

  function eloColor(elo: number) {
    const ratio = (elo - minElo) / (maxElo - minElo);
    if (ratio > 0.7) return "var(--accent)";
    if (ratio > 0.4) return "#888";
    return "#555";
  }

  const tiers = [
    { label: "Elite", min: 1900 },
    { label: "Strong", min: 1800 },
    { label: "Competitive", min: 1700 },
    { label: "Contenders", min: 0 },
  ];

  function getTier(elo: number) {
    return tiers.find((t) => elo >= t.min)?.label ?? "Contenders";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
          FIFA World Cup 2026
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Pre-tournament Power Rankings</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          {teams.length} teams ranked by Elo rating
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: "#666" }}>#</th>
              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: "#666" }}>Team</th>
              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: "#666" }}>Tier</th>
              <th className="text-right px-5 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: "#666" }}>Elo</th>
              <th className="px-5 py-3 w-48"></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => {
              const barWidth = ((team.elo - minElo) / (maxElo - minElo)) * 100;
              return (
                <tr
                  key={team.name}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: i % 2 === 0 ? "var(--background)" : "#111",
                  }}
                >
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#555" }}>
                    {i + 1}
                  </td>
                  <td className="px-5 py-3 font-medium">{team.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "#1a1a1a",
                        color: eloColor(team.elo),
                        border: "1px solid var(--border)",
                      }}
                    >
                      {getTier(team.elo)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold" style={{ color: eloColor(team.elo) }}>
                    {team.elo}
                  </td>
                  <td className="px-5 py-3">
                    <div className="rounded-full h-1.5 w-full" style={{ background: "var(--border)" }}>
                      <div
                        className="rounded-full h-1.5"
                        style={{ width: `${barWidth}%`, background: eloColor(team.elo) }}
                      />
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
