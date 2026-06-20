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