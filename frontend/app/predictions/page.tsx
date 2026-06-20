import { PredictionsClient } from "./PredictionsClient";

type SimEntry = { r32: number; r16: number; qf: number; sf: number; final: number; winner: number };
type Simulation = Record<string, SimEntry>;

interface Prediction { HOME_WIN: number; DRAW: number; AWAY_WIN: number; home_elo: number; away_elo: number; home_xg?: number; away_xg?: number }
interface Fixture { match_number: number; date: string; location: string; home_team: string; away_team: string; group: string; result: string | null; prediction: Prediction }

const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";

export default async function PredictionsPage() {
  let fixtures: Fixture[]  = [];
  let simulation: Simulation = {};

  try {
    [fixtures, simulation] = await Promise.all([
      fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()),
      fetch(`${BASE}/simulate`, { next: { revalidate: 3600 } }).then(r => r.json()),
    ]);
  } catch {}

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
        Predictions
      </h1>
      <PredictionsClient simulation={simulation} fixtures={fixtures} />
    </div>
  );
}
