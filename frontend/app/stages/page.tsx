import { Fixture, BASE } from "../_components/types";
import StagesClient from "./StagesClient";

export default async function StagesPage() {
  let fixtures: Fixture[] = [];
  try { fixtures = await fetch(`${BASE}/fixtures`, { cache: "no-store" }).then(r => r.json()); } catch {}

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
        Stage Findings
      </h1>
      <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-muted)" }}>
        How the model performed at each knockout round — accuracy, upsets, expected vs actual goals, and Elo swings.
      </p>
      <StagesClient fixtures={fixtures} />
    </div>
  );
}
