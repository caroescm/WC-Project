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

const TIERS = [
  { label: "Elite",       min: 1950, color: "var(--accent)",        bg: "rgba(201,168,76,0.1)",  border: "rgba(201,168,76,0.3)"  },
  { label: "Contender",   min: 1850, color: "#a78bfa",              bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)" },
  { label: "Strong",      min: 1750, color: "var(--blue)",          bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.22)" },
  { label: "Competitive", min: 0,    color: "var(--text-muted)",    bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
];

function getTier(elo: number) {
  return TIERS.find((t) => elo >= t.min) ?? TIERS[TIERS.length - 1];
}

function eloBarColor(elo: number, max: number, min: number) {
  const r = (elo - min) / (max - min);
  if (r > 0.75) return "var(--accent)";
  if (r > 0.45) return "var(--blue)";
  return "var(--text-faint)";
}

export default async function PredictorPage() {
  const res = await fetch("https://wc-project-production.up.railway.app/fixtures", { cache: "no-store" });
  const fixtures: Fixture[] = await res.json();

  const eloMap = new Map<string, number>();
  for (const f of fixtures) {
    if (!eloMap.has(f.home_team)) eloMap.set(f.home_team, f.prediction.home_elo);
    if (!eloMap.has(f.away_team)) eloMap.set(f.away_team, f.prediction.away_elo);
  }

  const teams: TeamEntry[] = Array.from(eloMap.entries())
    .map(([name, elo]) => ({ name, elo }))
    .sort((a, b) => b.elo - a.elo);

  const maxElo = teams[0]?.elo ?? 2000;
  const minElo = teams[teams.length - 1]?.elo ?? 1500;

  return (
    <div className="flex flex-col gap-10">

      {/* ── Header ────────────────────────────────── */}
      <div>
        <p
          className="text-xs font-bold tracking-widest uppercase mb-2"
          style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
        >
          FootballOdds
        </p>
        <h1 className="sport text-6xl" style={{ color: "var(--foreground)" }}>
          Power Rankings
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          {teams.length} teams ranked by Elo rating · pre-tournament snapshot
        </p>
      </div>

      {/* ── Tier legend ───────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TIERS.map((t) => (
          <span
            key={t.label}
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: "rgba(6,10,22,0.9)", borderBottom: "1px solid var(--border)" }}>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest w-12" style={{ color: "var(--text-faint)" }}>#</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Team</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest w-32" style={{ color: "var(--text-faint)" }}>Tier</th>
              <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest w-20" style={{ color: "var(--text-faint)" }}>Elo</th>
              <th className="px-5 py-3 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => {
              const tier = getTier(team.elo);
              const barW = ((team.elo - minElo) / (maxElo - minElo)) * 100;
              const barColor = eloBarColor(team.elo, maxElo, minElo);
              const isTop3 = i < 3;

              return (
                <tr
                  key={team.name}
                  className="table-row"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isTop3
                      ? "rgba(201,168,76,0.03)"
                      : i % 2 === 0 ? "rgba(6,10,22,0.7)" : "rgba(4,8,16,0.5)",
                  }}
                >
                  {/* Rank */}
                  <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: isTop3 ? "var(--accent)" : "var(--text-faint)" }}>
                    {i + 1}
                  </td>

                  {/* Team name */}
                  <td className="px-4 py-3.5">
                    <span className={`font-semibold ${isTop3 ? "sport text-base" : ""}`} style={{ color: "var(--foreground)" }}>
                      {team.name}
                    </span>
                  </td>

                  {/* Tier badge */}
                  <td className="px-4 py-3.5">
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
                    >
                      {tier.label}
                    </span>
                  </td>

                  {/* Elo value */}
                  <td className="px-4 py-3.5 text-right font-bold font-mono" style={{ color: barColor }}>
                    {team.elo}
                  </td>

                  {/* Elo bar */}
                  <td className="px-5 py-3.5">
                    <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(0,0,0,0.4)" }}>
                      <div className="h-full rounded-full" style={{ width: `${barW}%`, background: barColor }} />
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
