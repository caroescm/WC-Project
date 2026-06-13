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
  result: string;
  prediction: Prediction;
}

function MiniBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 rounded-full h-1.5" style={{ background: "var(--border)" }}>
        <div className="rounded-full h-1.5" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs w-8 text-right" style={{ color: "#888" }}>{pct}%</span>
    </div>
  );
}

function didPredictionMatch(result: string, prediction: Prediction): boolean {
  const [homeGoals, awayGoals] = result.split("-").map((s) => parseInt(s.trim(), 10));
  const predicted =
    prediction.HOME_WIN >= prediction.DRAW && prediction.HOME_WIN >= prediction.AWAY_WIN
      ? "home"
      : prediction.AWAY_WIN >= prediction.DRAW && prediction.AWAY_WIN >= prediction.HOME_WIN
      ? "away"
      : "draw";
  const actual =
    homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw";
  return predicted === actual;
}

function ArchiveCard({ fixture }: { fixture: Fixture }) {
  const correct = didPredictionMatch(fixture.result, fixture.prediction);
  const [homeGoals, awayGoals] = fixture.result.split("-").map((s) => s.trim());
  const homeWon = parseInt(homeGoals) > parseInt(awayGoals);
  const awayWon = parseInt(awayGoals) > parseInt(homeGoals);

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
          {fixture.group}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: correct ? "#1a2e1a" : "#2e1a1a",
            color: correct ? "#4caf50" : "#f44336",
          }}
        >
          {correct ? "✓ Correct" : "✗ Wrong"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className={`font-semibold flex-1 ${homeWon ? "" : "opacity-50"}`}>{fixture.home_team}</span>
        <span className="text-xl font-bold px-4 py-1 rounded-lg" style={{ background: "#1a1a1a", color: "var(--foreground)" }}>
          {fixture.result}
        </span>
        <span className={`font-semibold flex-1 text-right ${awayWon ? "" : "opacity-50"}`}>{fixture.away_team}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider" style={{ color: "#555" }}>Prediction</span>
        <div className="flex gap-2 items-center text-xs" style={{ color: "#888" }}>
          <span className="w-16 truncate">{fixture.home_team}</span>
          <MiniBar value={fixture.prediction.HOME_WIN} color="var(--accent)" />
        </div>
        <div className="flex gap-2 items-center text-xs" style={{ color: "#888" }}>
          <span className="w-16">Draw</span>
          <MiniBar value={fixture.prediction.DRAW} color="#555" />
        </div>
        <div className="flex gap-2 items-center text-xs" style={{ color: "#888" }}>
          <span className="w-16 truncate">{fixture.away_team}</span>
          <MiniBar value={fixture.prediction.AWAY_WIN} color="#4c7bc9" />
        </div>
      </div>
    </div>
  );
}

export default async function ArchivePage() {
  const res = await fetch("http://localhost:8000/fixtures", { cache: "no-store" });
  const fixtures: Fixture[] = await res.json();

  const played = fixtures.filter((f) => f.result !== null) as Fixture[];
  const correct = played.filter((f) => didPredictionMatch(f.result, f.prediction)).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
            FIFA World Cup 2026
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            Prediction accuracy vs real results
          </p>
        </div>
        {played.length > 0 && (
          <div className="text-right rounded-xl px-5 py-3" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {Math.round((correct / played.length) * 100)}%
            </div>
            <div className="text-xs" style={{ color: "#666" }}>
              {correct}/{played.length} correct
            </div>
          </div>
        )}
      </div>

      {played.length === 0 && (
        <p style={{ color: "#666" }}>No completed matches yet.</p>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {played.map((f) => (
          <ArchiveCard key={f.match_number} fixture={f} />
        ))}
      </div>
    </div>
  );
}
