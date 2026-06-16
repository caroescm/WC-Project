"use client";

import { motion } from "framer-motion";
import { AnimatedBar } from "./AnimatedBar";
import { parseMatchDateUTC } from "./dateUtils";

interface Match {
  match_number: number;
  home_team: string;
  away_team: string;
  date: string;
  group: string;
  prediction: {
    HOME_WIN: number;
    DRAW: number;
    AWAY_WIN: number;
  };
}

export function DashboardMatches({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return <div className="empty">No upcoming matches found.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {matches.filter((m) => m.prediction !== null).map((m, i) => {
        const matchDate = parseMatchDateUTC(m.date);
        const dateLabel = matchDate.toLocaleDateString([], { month: "short", day: "numeric" });
        const timeLabel = matchDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        return (
          <motion.div
            key={m.match_number}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 + 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="card"
            style={{ padding:12, display:"flex", flexDirection:"column", gap:6 }}
          >
            <div className="flex items-center justify-between">
              <span className="badge badge-accent">{m.group}</span>
              <span className="text-xs" style={{ color:"var(--text-faint)" }}>
                {dateLabel} · {timeLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="sport text-base flex-1" style={{ color:"var(--foreground)" }}>
                {m.home_team}
              </span>
              <span className="text-xs" style={{ color:"var(--text-faint)", flexShrink:0 }}>vs</span>
              <span className="sport text-base flex-1 text-right" style={{ color:"var(--foreground)" }}>
                {m.away_team}
              </span>
            </div>

            <AnimatedBar
              homeWin={m.prediction.HOME_WIN}
              draw={m.prediction.DRAW}
              awayWin={m.prediction.AWAY_WIN}
              homeTeam={m.home_team}
              awayTeam={m.away_team}
              compact
            />
          </motion.div>
        );
      })}
    </div>
  );
}
