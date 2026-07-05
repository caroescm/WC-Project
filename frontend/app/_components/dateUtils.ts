// Parses "dd/mm/yyyy HH:MM" as UTC and returns a Date object
export function parseMatchDateUTC(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split("/");
  const [hh, min] = timePart.split(":");
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min));
}

// Parses "H - A" score string into [homeGoals, awayGoals]
export function parseScore(r: string): [number, number] | null {
  const m = r.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [+m[1], +m[2]] : null;
}

// Returns the predicted outcome label from a prediction object
export function predictedOutcome(p: { HOME_WIN: number; DRAW: number; AWAY_WIN: number }): string {
  if (p.HOME_WIN >= p.DRAW && p.HOME_WIN >= p.AWAY_WIN) return "Home Win";
  if (p.AWAY_WIN >= p.DRAW && p.AWAY_WIN >= p.HOME_WIN) return "Away Win";
  return "Draw";
}

// Returns the predicted outcome as a key ("HOME_WIN" | "AWAY_WIN" | "DRAW")
export function bestOutcomeKey(p: { HOME_WIN: number; DRAW: number; AWAY_WIN: number }): "HOME_WIN" | "AWAY_WIN" | "DRAW" {
  if (p.HOME_WIN >= p.DRAW && p.HOME_WIN >= p.AWAY_WIN) return "HOME_WIN";
  if (p.AWAY_WIN >= p.DRAW && p.AWAY_WIN >= p.HOME_WIN) return "AWAY_WIN";
  return "DRAW";
}

// Returns who actually won, accounting for penalty shootouts. `penalties` is a
// "H - A" string (only ever set when the 90/120-minute score finished level) —
// the goal score itself never includes shootout kicks, so a level score with no
// penalties recorded is a genuine draw.
export function actualOutcomeKey(hs: number, as_: number, penalties?: string | null): "HOME_WIN" | "AWAY_WIN" | "DRAW" {
  if (hs === as_ && penalties) {
    const pens = parseScore(penalties);
    if (pens && pens[0] !== pens[1]) return pens[0] > pens[1] ? "HOME_WIN" : "AWAY_WIN";
  }
  return hs > as_ ? "HOME_WIN" : hs < as_ ? "AWAY_WIN" : "DRAW";
}