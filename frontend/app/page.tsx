import Link from "next/link";

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

const statCards = [
  { label: "Teams", value: "48" },
  { label: "Group Matches", value: "104" },
  { label: "Host Countries", value: "3" },
  { label: "Kickoff", value: "Jun 11" },
];

export default async function Home() {
  let upcomingMatches: Fixture[] = [];
  try {
    const res = await fetch("http://localhost:8000/fixtures", { cache: "no-store" });
    const fixtures: Fixture[] = await res.json();
    upcomingMatches = fixtures.filter((f) => f.result === null).slice(0, 3);
  } catch {
    // backend not reachable — show empty state
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
            FIFA World Cup 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ background: "#1a2e1a", color: "#4caf50" }}>
          ● Live Predictions
        </span>
      </div>

      {/* Stat Row */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl p-5 flex flex-col gap-1" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <span className="text-xs uppercase tracking-wider" style={{ color: "#666" }}>{s.label}</span>
            <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Upcoming - wide */}
        <Link href="/upcoming" className="col-span-2 rounded-xl p-6 flex flex-col gap-3" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Upcoming Matches</h2>
            <span className="text-xs" style={{ color: "var(--accent)" }}>View all →</span>
          </div>
          <p className="text-sm" style={{ color: "#666" }}>
            Next fixtures with win/draw/loss probabilities via Elo ratings.
          </p>
          <div className="mt-auto flex flex-col gap-2">
            {upcomingMatches.length === 0 ? (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#1a1a1a", border: "1px solid var(--border)", color: "#555" }}>
                No upcoming matches
              </div>
            ) : (
              upcomingMatches.map((m) => {
                const [datePart, timePart] = m.date.split(" ");
                const [dd, mm] = datePart.split("/");
                const dateLabel = new Date(`2026-${mm}-${dd}`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const homePct = Math.round(m.prediction.HOME_WIN * 100);
                const awayPct = Math.round(m.prediction.AWAY_WIN * 100);
                const drawPct = Math.round(m.prediction.DRAW * 100);
                return (
                  <div key={m.match_number} className="rounded-lg px-4 py-3 text-sm flex flex-col gap-2" style={{ background: "#1a1a1a", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.home_team} <span style={{ color: "#555" }}>vs</span> {m.away_team}</span>
                      <span style={{ color: "#555" }}>{dateLabel} · {timePart}</span>
                    </div>
                    <div className="flex gap-1 h-1 rounded-full overflow-hidden">
                      <div style={{ width: `${homePct}%`, background: "var(--accent)" }} />
                      <div style={{ width: `${drawPct}%`, background: "#444" }} />
                      <div style={{ width: `${awayPct}%`, background: "#4c7bc9" }} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "#555" }}>
                      <span>{homePct}%</span>
                      <span>{drawPct}% draw</span>
                      <span>{awayPct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Link>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Link href="/predictor" className="rounded-xl p-6 flex flex-col gap-2" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <span className="text-2xl">🏆</span>
            <h2 className="font-semibold">Tournament Predictor</h2>
            <p className="text-sm" style={{ color: "#666" }}>
              Who wins the cup? Static + live simulation.
            </p>
          </Link>

          <Link href="/archive" className="rounded-xl p-6 flex flex-col gap-2" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <span className="text-2xl">📋</span>
            <h2 className="font-semibold">Archive</h2>
            <p className="text-sm" style={{ color: "#666" }}>
              Prediction accuracy vs real results.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
