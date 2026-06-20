export interface Prediction {
  HOME_WIN: number;
  DRAW: number;
  AWAY_WIN: number;
  home_xg: number;
  away_xg: number;
  home_elo?: number;
  away_elo?: number;
}

export interface Fixture {
  match_number: number;
  date: string;
  location?: string;
  home_team: string;
  away_team: string;
  group: string;
  result: string | null;
  prediction: Prediction;
}

export const BASE = process.env.API_URL ?? "https://wc-project-production.up.railway.app";
