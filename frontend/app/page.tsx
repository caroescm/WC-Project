import Link from "next/link";

const statCards = [
  { label: "Teams", value: "48" },
  { label: "Group Matches", value: "104" },
  { label: "Host Countries", value: "3" },
  { label: "Kickoff", value: "Jun 11" },
];

export default function Home() {
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
            Next fixtures with win/draw/loss probabilities and expected goals.
          </p>
          <div className="mt-auto flex flex-col gap-2">
            {[
              { home: "Mexico", away: "South Africa", date: "Jun 11" },
              { home: "USA", away: "Canada", date: "Jun 12" },
              { home: "Argentina", away: "Peru", date: "Jun 14" },
            ].map((m) => (
              <div key={m.home} className="flex items-center justify-between rounded-lg px-4 py-3 text-sm" style={{ background: "#1a1a1a", border: "1px solid var(--border)" }}>
                <span className="font-medium">{m.home} <span style={{ color: "#555" }}>vs</span> {m.away}</span>
                <span style={{ color: "#555" }}>{m.date}</span>
              </div>
            ))}
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
