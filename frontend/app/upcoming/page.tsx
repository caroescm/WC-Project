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

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-1 flex-1">
      <div className="flex justify-between text-xs" style={{ color: "#888" }}>
        <span>{label}</span>
        <span style={{ color: "var(--foreground)" }}>{pct}%</span>
      </div>
      <div className="rounded-full h-1.5 w-full" style={{ background: "var(--border)" }}>
        <div className="rounded-full h-1.5" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function MatchCard({ fixture }: { fixture: Fixture }) {
  const time = fixture.date.split(" ")[1];
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
          {fixture.group}
        </span>
        <span className="text-xs" style={{ color: "#666" }}>{time} · {fixture.location}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-base flex-1">{fixture.home_team}</span>
        <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#1a1a1a", color: "#555" }}>vs</span>
        <span className="font-semibold text-base flex-1 text-right">{fixture.away_team}</span>
      </div>

      <div className="flex gap-3">
        <ProbBar label={fixture.home_team} value={fixture.prediction.HOME_WIN} color="var(--accent)" />
        <ProbBar label="Draw" value={fixture.prediction.DRAW} color="#555" />
        <ProbBar label={fixture.away_team} value={fixture.prediction.AWAY_WIN} color="#4c7bc9" />
      </div>

      <div className="flex justify-between text-xs" style={{ color: "#555" }}>
        <span>ELO: {fixture.prediction.home_elo}</span>
        <span>ELO: {fixture.prediction.away_elo}</span>
      </div>
    </div>
  );
}

export default async function UpcomingPage() {
  const res = await fetch("http://localhost:8000/fixtures", { cache: "no-store" });
  const fixtures: Fixture[] = await res.json();

  const upcoming = fixtures.filter((f) => f.result === null);

  const grouped = new Map<string, Fixture[]>();
  for (const f of upcoming) {
    const datePart = f.date.split(" ")[0];
    if (!grouped.has(datePart)) grouped.set(datePart, []);
    grouped.get(datePart)!.push(f);
  }

  function formatDateLabel(ddmmyyyy: string) {
    const [dd, mm, yyyy] = ddmmyyyy.split("/");
    return new Date(`${yyyy}-${mm}-${dd}`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
          FIFA World Cup 2026
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Matches</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>
          {upcoming.length} matches remaining · win/draw/loss probabilities via Elo
        </p>
      </div>

      {grouped.size === 0 && (
        <p style={{ color: "#666" }}>No upcoming matches found.</p>
      )}

      {Array.from(grouped.entries()).map(([date, matches]) => (
        <div key={date} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#888" }}>
            {formatDateLabel(date)}
          </h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {matches.map((f) => (
              <MatchCard key={f.match_number} fixture={f} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
