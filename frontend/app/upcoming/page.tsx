import { UpcomingClient } from "./UpcomingClient";

interface Fixture {
  match_number: number;
  date: string;
  location: string;
  home_team: string;
  away_team: string;
  group: string;
  result: string | null;
  prediction: {
    HOME_WIN: number;
    DRAW: number;
    AWAY_WIN: number;
    home_elo: number;
    away_elo: number;
  };
}

export default async function UpcomingPage() {
  const res = await fetch("http://localhost:8000/fixtures", { cache: "no-store" });
  const fixtures: Fixture[] = await res.json();

  const upcomingCount = fixtures.filter((f) => f.result === null).length;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ────────────────────────────────── */}
      <div>
        <p
          className="text-xs font-bold tracking-widest uppercase mb-2"
          style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
        >
          FIFA World Cup 2026
        </p>
        <h1 className="sport text-6xl" style={{ color: "var(--foreground)" }}>
          Upcoming
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          {upcomingCount} matches remaining · probabilities via Elo · upset alerts included
        </p>
      </div>

      {/* ── Interactive client section ─────────────── */}
      <UpcomingClient fixtures={fixtures} />
    </div>
  );
}
