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
  result: string;
  prediction: Prediction;
}

function didPredictionMatch(result: string, prediction: Prediction): boolean {
  const [hg, ag] = result.split("-").map((s) => parseInt(s.trim(), 10));
  const predicted =
    prediction.HOME_WIN >= prediction.DRAW && prediction.HOME_WIN >= prediction.AWAY_WIN ? "home"
    : prediction.AWAY_WIN >= prediction.DRAW && prediction.AWAY_WIN >= prediction.HOME_WIN ? "away"
    : "draw";
  const actual = hg > ag ? "home" : ag > hg ? "away" : "draw";
  return predicted === actual;
}

function MiniSegmentBar({ h, d, a }: { h: number; d: number; a: number }) {
  const dominant = h >= a ? (h >= d ? "home" : "draw") : a >= d ? "away" : "draw";
  return (
    <div className="bar-track" style={{ height: 5 }}>
      <div className="bar-fill" style={{
        width: "100%",
        background: `linear-gradient(to right,
          ${dominant === "home" ? "var(--accent)" : "var(--text-faint)"} 0% ${h}%,
          var(--border) ${h}% ${h + d}%,
          ${dominant === "away" ? "var(--accent)" : "var(--text-faint)"} ${h + d}% 100%)`,
      }} />
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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="badge badge-accent">{fixture.group}</span>
        <span className="badge" style={{
          background: correct ? "var(--positive-dim)" : "var(--negative-dim)",
          color: correct ? "var(--positive)" : "var(--negative)",
        }}>
          {correct ? "✓ Correct" : "✗ Missed"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="sport" style={{ fontSize: "1.25rem", flex: 1, color: homeWon ? "var(--foreground)" : "var(--text-faint)" }}>
          {fixture.home_team}
        </span>
        <div className="sport" style={{ flexShrink: 0, padding: "4px 16px", borderRadius: 8, fontWeight: 700, fontSize: "1.125rem", background: "var(--bg-page)", color: "var(--foreground)" }}>
          {hg} – {ag}
        </div>
        <span className="sport" style={{ fontSize: "1.25rem", flex: 1, textAlign: "right", color: awayWon ? "var(--foreground)" : "var(--text-faint)" }}>
          {fixture.away_team}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="card-title">Model prediction</span>
        <MiniSegmentBar h={h} d={d} a={a} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-faint)" }}>
          <span>{h}% {fixture.home_team}</span>
          <span>{d}% Draw</span>
          <span>{a}% {fixture.away_team}</span>
        </div>
      </div>
    </div>
  );
}

export default async function ArchivePage() {
  const res = await fetch("https://wc-project-production.up.railway.app/fixtures", { cache: "no-store" });
  const fixtures = await res.json() as Array<{ result: string | null } & Omit<Fixture, "result">>;
  const played = fixtures.filter((f) => f.result !== null && f.prediction !== null) as Fixture[];
  const correctCount = played.filter((f) => didPredictionMatch(f.result, f.prediction)).length;
  const accuracy = played.length > 0 ? Math.round((correctCount / played.length) * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/" className="back-link">← Back</Link>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 8 }}>
        <div>
          <h1 className="page-title">Archive</h1>
          <p className="page-subtitle">Prediction accuracy vs real results</p>
        </div>
        {accuracy !== null && (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span className="sport" style={{ fontSize: "1.375rem", color: "var(--foreground)" }}>{accuracy}%</span>
            <span className="card-title">{correctCount}/{played.length} correct</span>
          </div>
        )}
      </div>

      {played.length === 0 ? (
        <div className="empty">No completed matches yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {played.map((f) => (
            <ArchiveCard key={f.match_number} fixture={f} />
          ))}
        </div>
      )}
    </div>
  );
}
