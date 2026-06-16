import Link from "next/link";

type SimEntry = { r32:number; r16:number; qf:number; sf:number; final:number; winner:number };
type Simulation = Record<string, SimEntry>;

const BASE = "https://wc-project-production.up.railway.app";

export default async function MonteCarloPage() {
  let simulation: Simulation = {};
  try {
    simulation = await fetch(`${BASE}/simulate`, { cache:"no-store" }).then(r => r.json());
  } catch {}

  const ranked = Object.entries(simulation)
    .sort(([,a],[,b]) => b.winner - a.winner);

  const maxWinner = ranked[0]?.[1].winner ?? 1;

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const rowBg = (i: number): string => {
    if (i < 3)  return "rgba(201,168,76,0.06)";
    if (i < 8)  return "rgba(59,130,246,0.04)";
    return "transparent";
  };

  const th: React.CSSProperties = {
    padding: "8px 12px", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: "var(--text-muted)", textAlign: "left",
    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "9px 12px", fontSize: 13, color: "var(--foreground)",
    borderBottom: "1px solid var(--border)", verticalAlign: "middle",
  };
  const tdMuted: React.CSSProperties = { ...td, color: "var(--text-muted)", fontSize: 12 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <Link href="/" style={{ fontSize:11, color:"var(--text-muted)", textDecoration:"none" }}>
        ← Dashboard
      </Link>

      <div>
        <h1 className="sport" style={{ fontSize:36, color:"var(--foreground)", marginBottom:4 }}>
          Tournament Odds
        </h1>
        <p style={{ fontSize:12, color:"var(--text-muted)" }}>
          3,000 Monte Carlo simulations · pre-tournament model
        </p>
      </div>

      {ranked.length === 0 ? (
        <p style={{ color:"var(--text-muted)", fontSize:13 }}>Simulation data unavailable.</p>
      ) : (
        <div className="grad-border-gold" style={{ borderRadius:16, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["#","Team","Winner","Final","Semis","QF","R16","R32"].map(h => (
                  <th key={h} style={{ ...th, textAlign: h === "#" || h === "Team" ? "left" : "right" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map(([team, p], i) => (
                <tr key={team} style={{ background: rowBg(i) }}>
                  {/* # */}
                  <td style={{ ...tdMuted, width:32 }}>{i + 1}</td>

                  {/* Team */}
                  <td style={{ ...td, fontWeight: i < 3 ? 600 : 400,
                               color: i < 3 ? "var(--accent)" : "var(--foreground)" }}>
                    {team}
                  </td>

                  {/* Winner — bar + % */}
                  <td style={{ ...td, textAlign:"right", width:160 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                      <div style={{ width:80, height:5, borderRadius:3,
                                    background:"rgba(255,255,255,0.06)", flexShrink:0 }}>
                        <div style={{ height:"100%", borderRadius:3, background:"var(--accent)",
                                      width:`${(p.winner / maxWinner) * 100}%` }} />
                      </div>
                      <span style={{ fontWeight:700, color:"var(--accent)", width:42, textAlign:"right" }}>
                        {pct(p.winner)}
                      </span>
                    </div>
                  </td>

                  {/* Final */}
                  <td style={{ ...tdMuted, textAlign:"right" }}>{pct(p.final)}</td>
                  {/* SF */}
                  <td style={{ ...tdMuted, textAlign:"right" }}>{pct(p.sf)}</td>
                  {/* QF */}
                  <td style={{ ...tdMuted, textAlign:"right" }}>{pct(p.qf)}</td>
                  {/* R16 */}
                  <td style={{ ...tdMuted, textAlign:"right" }}>{pct(p.r16)}</td>
                  {/* R32 */}
                  <td style={{ ...tdMuted, textAlign:"right" }}>{pct(p.r32)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
