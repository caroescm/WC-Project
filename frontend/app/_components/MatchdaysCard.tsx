interface Props {
  matchesPlayed: number;
  daysElapsed:   number;
}

const TOTAL_DAYS  = 39;
const START_DOW   = 4; // Thursday (Sun=0)
const TOTAL_COLS  = 30;
const ACTIVE_COLS = 7; // 39 days span 7 columns
const COL_OFFSET  = Math.floor((TOTAL_COLS - ACTIVE_COLS) / 2); // 11 — centers the active block

// The 39 active cells with their grid position
const ACTIVE_CELLS = (() => {
  const out: { col: number; row: number; idx: number }[] = [];
  let col = COL_OFFSET, row = START_DOW;
  for (let i = 0; i < TOTAL_DAYS; i++) {
    out.push({ col, row, idx: i });
    if (++row === 7) { row = 0; col++; }
  }
  return out;
})();

// Full background grid: 49 cols × 7 rows
const ALL_CELLS = (() => {
  const out: { col: number; row: number }[] = [];
  for (let c = 0; c < TOTAL_COLS; c++)
    for (let r = 0; r < 7; r++)
      out.push({ col: c, row: r });
  return out;
})();

// Grid column 0 = Sunday of the week 11 weeks before the active start (June 11 Thursday)
// June 11 - 4 days (to get to Sunday June 7) - 11 weeks = Sunday March 22, 2026
const GRID_START = new Date("2026-06-11");
GRID_START.setDate(GRID_START.getDate() - START_DOW - COL_OFFSET * 7);

// Month labels for all 30 columns — label wherever the month changes
const MONTH_LABELS = (() => {
  const out: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < TOTAL_COLS; col++) {
    const weekStart = new Date(GRID_START);
    weekStart.setDate(weekStart.getDate() + col * 7);
    const month = weekStart.getMonth();
    if (month !== lastMonth) {
      out.push({ col, label: weekStart.toLocaleString("en-US", { month: "short" }) });
      lastMonth = month;
    }
  }
  return out;
})();

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Square cells — C is both width and height
const C    = 18;
const G    = 4;
const STEP = C + G;  // 22
const LW   = 28;     // left label column
const HH   = 16;     // header height

const VW = LW + TOTAL_COLS * STEP - G;   // 28 + 30×22 - 4 = 684
const VH = HH + 7 * STEP - G;            // 16 + 154 - 4 = 166

export default function MatchdaysCard({ matchesPlayed, daysElapsed }: Props) {
  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Title */}
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        Matchdays
      </div>

      {/* Numbers */}
      <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
        <div>
          <div className="sport" style={{ fontSize: "2.25rem", lineHeight: 1, color: "var(--foreground)" }}>
            {matchesPlayed}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: 3 }}>matches played</div>
        </div>
        <div>
          <div className="sport" style={{ fontSize: "2.25rem", lineHeight: 1, color: "var(--foreground)" }}>
            {daysElapsed}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: 3 }}>days</div>
        </div>
      </div>

      {/* Grid — 49 columns, square cells, 39 active centered */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        style={{ display: "block", height: "auto" }}
        aria-hidden="true"
      >
        {/* Month labels across all columns */}
        {MONTH_LABELS.map(({ col, label }) => (
          <text key={label} x={LW + col * STEP} y={11} textAnchor="start" fontSize={8} fontWeight={600} fill="#6b7280">
            {label}
          </text>
        ))}

        {/* Day labels — Mon, Wed, Fri only */}
        {[1, 3, 5].map(dow => (
          <text
            key={dow}
            x={LW - 3}
            y={HH + dow * STEP + C / 2 + 3.5}
            textAnchor="end"
            fontSize={8}
            fontWeight={600}
            fill="#6b7280"
          >
            {DAY_NAMES[dow]}
          </text>
        ))}

        {/* Background grid — all cells, muted */}
        {ALL_CELLS.map(({ col, row }) => (
          <rect
            key={`${col}-${row}`}
            x={LW + col * STEP}
            y={HH + row * STEP}
            width={C}
            height={C}
            rx={2}
            fill="#ddd8ee"
          />
        ))}

        {/* Active tournament days — past, today, future */}
        {ACTIVE_CELLS.map(({ col, row, idx }) => {
          const isCompleted = idx < daysElapsed - 1;
          const isToday     = idx === daysElapsed - 1;
          const fill = isToday     ? "#7c3aed"
                     : isCompleted ? "#a78bfa"
                     :               "#ede9f8";
          return (
            <rect
              key={`active-${idx}`}
              x={LW + col * STEP}
              y={HH + row * STEP}
              width={C}
              height={C}
              rx={2}
              fill={fill}
            />
          );
        })}

        {/* Today ring */}
        {daysElapsed > 0 && daysElapsed <= TOTAL_DAYS && (() => {
          const cell = ACTIVE_CELLS[daysElapsed - 1];
          return (
            <rect
              x={LW + cell.col * STEP + 0.5}
              y={HH + cell.row * STEP + 0.5}
              width={C - 1}
              height={C - 1}
              rx={2}
              fill="none"
              stroke="#5b21b6"
              strokeWidth={1.5}
            />
          );
        })()}
      </svg>
    </div>
  );
}
