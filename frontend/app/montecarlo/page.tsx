import Link from "next/link";

type SimEntry = { r32:number; r16:number; qf:number; sf:number; final:number; winner:number };
type Simulation = Record<string, SimEntry>;

const BASE = "https://wc-project-production.up.railway.app";

export default async function MonteCarloPage() {
  let simulation: Simulation = {};
  try {
    simulation = await fetch(`${BASE}/simulate`, { next: { revalidate: 3600 } }).then(r => r.json());
  } catch {}

  const ranked = Object.entries(simulation).sort(([,a],[,b]) => b.winner - a.winner);
  const maxWinner = ranked[0]?.[1].winner ?? 1;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" className="back-link">← Back</Link>

      <div>
        <h1 className="page-title">Tournament Odds</h1>
        <p className="page-subtitle">3,000 Monte Carlo simulations · pre-tournament model</p>
      </div>

      {ranked.length === 0 ? (
        <div className="empty">Simulation data unavailable.</div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                {["#","Team","Winner","Final","Semis","QF","R16","R32"].map(h => (
                  <th key={h} className="table-header" style={{ textAlign: h === "#" || h === "Team" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map(([team, p], i) => {
                const top3 = i < 3;
                return (
                  <tr key={team} className="table-row">
                    <td className="table-cell" style={{ color:"var(--text-faint)", width:32 }}>{i + 1}</td>
                    <td className="table-cell" style={{ fontWeight: top3 ? 600 : 500, color: top3 ? "var(--accent)" : "var(--foreground)" }}>{team}</td>
                    <td className="table-cell" style={{ textAlign:"right" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                        <div className="bar-track" style={{ width:80, flexShrink:0 }}>
                          <div className="bar-fill" style={{ background: top3 ? "var(--accent)" : "var(--border)", width:`${(p.winner / maxWinner) * 100}%` }} />
                        </div>
                        <span style={{ fontWeight:600, color: top3 ? "var(--accent)" : "var(--text-faint)", width:40, textAlign:"right" }}>{pct(p.winner)}</span>
                      </div>
                    </td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{pct(p.final)}</td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{pct(p.sf)}</td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{pct(p.qf)}</td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{pct(p.r16)}</td>
                    <td className="table-cell" style={{ textAlign:"right", color:"var(--text-faint)" }}>{pct(p.r32)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
