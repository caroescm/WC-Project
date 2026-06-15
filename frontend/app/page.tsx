import Link from "next/link";
import { HeroCard }         from "./_components/HeroCard";
import { DashboardMatches } from "./_components/DashboardMatches";
import { Countdown }        from "./_components/Countdown";

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

const TrophyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
    <rect x="5"  y="17" width="6" height="9" rx="1.5" fill="var(--accent)" opacity="0.55" />
    <rect x="12" y="10" width="6" height="16" rx="1.5" fill="var(--accent)" />
    <rect x="19" y="20" width="6" height="6"  rx="1.5" fill="var(--accent)" opacity="0.38" />
    <line x1="5" y1="28" x2="25" y2="28" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
    <rect x="4"  y="4"  width="22" height="4"  rx="1.5" fill="var(--blue)" opacity="0.4" />
    <rect x="4"  y="11" width="15" height="2.5" rx="1"   fill="var(--blue)" opacity="0.6" />
    <rect x="4"  y="16" width="11" height="2.5" rx="1"   fill="var(--blue)" opacity="0.5" />
    <rect x="4"  y="21" width="7"  height="2.5" rx="1"   fill="var(--blue)" opacity="0.35"/>
    <path d="M20 19 L24 24 L28 17" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function Home() {
  let upcomingMatches: Fixture[] = [];
  try {
    const res = await fetch("https://wc-project-production.up.railway.app/fixtures", { cache: "no-store" });
    const fixtures: Fixture[] = await res.json();
    upcomingMatches = fixtures.filter((f) => f.result === null).slice(0, 3);
  } catch {
    /* backend offline */
  }

  const nextMatch = upcomingMatches[0] ?? null;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ───────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-1.5"
            style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
          >
            FootballOdds
          </p>
          <h1 className="sport text-5xl" style={{ color: "var(--foreground)" }}>
            Dashboard
          </h1>
        </div>

        <span
          className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{
            background: "rgba(15,40,15,0.8)",
            color: "#4caf50",
            border: "1px solid rgba(76,175,80,0.2)",
          }}
        >
          <span className="pulse-dot inline-block mr-1.5 w-1.5 h-1.5 rounded-full align-middle" style={{ background: "#4caf50" }} />Live Predictions
        </span>
      </div>

      {/* ── Main grid ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Upcoming – wide panel */}
        <div className="col-span-2 rounded-2xl p-5 flex flex-col gap-4 grad-border">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base tracking-tight">Upcoming Matches</h2>
            <Link href="/upcoming" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              View all →
            </Link>
          </div>

          {/* Countdown to next match */}
          {nextMatch && (
            <Countdown
              nextDate={nextMatch.date}
              homeTeam={nextMatch.home_team}
              awayTeam={nextMatch.away_team}
              group={nextMatch.group}
            />
          )}

          <DashboardMatches matches={upcomingMatches} />
        </div>

        {/* Right column – hero cards */}
        <div className="flex flex-col gap-5">
          <HeroCard
            href="/predictor"
            title="Power Rankings"
            description="48 teams ranked by Elo. Who dominates?"
            badge="Tournament"
            glowColor="rgba(201,168,76,0.18)"
            accentColor="var(--accent)"
            icon={<TrophyIcon />}
          />
          <HeroCard
            href="/archive"
            title="Archive"
            description="Prediction accuracy vs real results."
            badge="Stats"
            glowColor="rgba(59,130,246,0.15)"
            accentColor="var(--blue)"
            icon={<ArchiveIcon />}
          />
        </div>
      </div>
    </div>
  );
}
