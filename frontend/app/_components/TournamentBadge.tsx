export default function TournamentBadge() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", color: "var(--text-muted)", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 0, padding: "6px 12px" }}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1 6.5H15" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M11 1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <span>June 11 – July 19</span>
    </div>
  );
}
