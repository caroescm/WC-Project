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

function didPredictionMatch(result: string, prediction: Prediction): boolean {
  const [hg, ag] = result.split("-").map((s) => parseInt(s.trim(), 10));
  const predicted =
    prediction.HOME_WIN >= prediction.DRAW && prediction.HOME_WIN >= prediction.AWAY_WIN
      ? "home"
      : prediction.AWAY_WIN >= prediction.DRAW && prediction.AWAY_WIN >= prediction.HOME_WIN
      ? "away"
      : "draw";
  const actual = hg > ag ? "home" : ag > hg ? "away" : "draw";
  return predicted === actual;
}

/** Single-row mini probability bar (pure CSS, no animation needed here) */
function MiniSegmentBar({ h, d, a }: { h: number; d: number; a: number }) {
  const dominant = h >= a ? (h >= d ? "home" : "draw") : a >= d ? "away" : "draw";
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: 5, background: "rgba(0,0,0,0.35)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: "100%",
          background: `linear-gradient(to right,
            ${dominant === "home" ? "var(--accent)" : "rgba(201,168,76,0.3)"} 0% ${h}%,
            #374151 ${h}% ${h + d}%,
            ${dominant === "away" ? "var(--blue)" : "rgba(59,130,246,0.3)"} ${h + d}% 100%)`,
        }}
      />
    </div>
  );
}

function ArchiveCard({ fixture }: { fixture: Fixture }) {
  const correct = didPredictionMatch(fixture.result, fixture.prediction);
  const [hg, ag] = fixture.result.split("-").map((s) => parseInt(s.trim(), 10));
  const homeWon = hg > ag;
  const awayWon = ag > hg;
  const h = Math.round(fixture.prediction.HOME_WIN * 100);
  const d = Math.round(fixture.prediction.DRAW * 100);
  const a = Math.round(fixture.prediction.AWAY_WIN * 100);

  return (
    <div
      className={`rounded-2xl p-5 flex flex-col gap-4 card-lift ${correct ? "grad-border" : "grad-border"}`}
      style={{
        background: correct
          ? "rgba(10, 20, 10, 0.7)"
          : "rgba(18, 10, 10, 0.7)",
        backdropFilter: "blur(24px)",
        border: `1px solid ${correct ? "rgba(76,175,80,0.15)" : "rgba(244,67,54,0.12)"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(201,168,76,0.07)",
            color: "var(--accent)",
            border: "1px solid rgba(201,168,76,0.15)",
          }}
        >
          {fixture.group}
        </span>
        <span
          className="text-xs font-bold tracking-wide px-2.5 py-0.5 rounded-full"
          style={{
            background: correct ? "rgba(15,40,15,0.8)" : "rgba(40,10,10,0.8)",
            color: correct ? "#4caf50" : "#f44336",
            border: `1px solid ${correct ? "rgba(76,175,80,0.25)" : "rgba(244,67,54,0.2)"}`,
          }}
        >
          {correct ? "✓ Correct" : "✗ Missed"}
        </span>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-3">
        <span
          className={`sport text-2xl flex-1 ${homeWon ? "" : "opacity-35"}`}
          style={{ color: "var(--foreground)" }}
        >
          {fixture.home_team}
        </span>

        <div
          className="flex-shrink-0 px-4 py-1.5 rounded-xl font-bold text-xl sport"
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "var(--foreground)",
            letterSpacing: "0.05em",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {hg} – {ag}
        </div>

        <span
          className={`sport text-2xl flex-1 text-right ${awayWon ? "" : "opacity-35"}`}
          style={{ color: "var(--foreground)" }}
        >
          {fixture.away_team}
        </span>
      </div>

      {/* Prediction preview */}
      <div className="flex flex-col gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-faint)" }}
        >
          Model prediction
        </span>

        <MiniSegmentBar h={h} d={d} a={a} />

        <div className="flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
          <span>{h}% {fixture.home_team}</span>
          <span>{d}% Draw</span>
          <span>{a}% {fixture.away_team}</span>
        </div>
      </div>
    </div>
  );
}

export default async function ArchivePage() {
  const res = await fetch("http://localhost:8000/fixtures", { cache: "no-store" });
  const fixtures = await res.json() as Array<{ result: string | null } & Omit<Fixture, "result">>;
  const played = fixtures.filter((f) => f.result !== null) as Fixture[];
  const correctCount = played.filter((f) => didPredictionMatch(f.result, f.prediction)).length;
  const accuracy = played.length > 0 ? Math.round((correctCount / played.length) * 100) : null;

  return (
    <div className="flex flex-col gap-10">

      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-2"
            style={{ color: "var(--accent)", letterSpacing: "0.2em" }}
          >
            FootballOdds
          </p>
          <h1 className="sport text-6xl" style={{ color: "var(--foreground)" }}>
            Archive
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Prediction accuracy vs real results
          </p>
        </div>

        {accuracy !== null && (
          <div
            className="flex-shrink-0 rounded-2xl px-6 py-4 flex flex-col items-end gap-0.5 grad-border-gold"
          >
            <span className="sport text-5xl" style={{ color: "var(--accent)" }}>
              {accuracy}%
            </span>
            <span className="text-xs font-semibold" style={{ color: "rgba(201,168,76,0.55)" }}>
              {correctCount}/{played.length} correct
            </span>
          </div>
        )}
      </div>

      {/* ── Cards ─────────────────────────────────── */}
      {played.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No completed matches yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {played.map((f) => (
            <ArchiveCard key={f.match_number} fixture={f} />
          ))}
        </div>
      )}
    </div>
  );
}
