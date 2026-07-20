import numpy as np
import pandas as pd
from pathlib import Path
from .config import K_FACTORS, name_map

BASE_DIR = Path(__file__).parent.parent
EWM_SPAN       = 10
EWM_ALPHA      = 2 / (EWM_SPAN + 1)
EWM_SPAN_SHORT = 5
EWM_ALPHA_SHORT = 2 / (EWM_SPAN_SHORT + 1)


def _update_rolling_stats(team: str, goals_for: int, goals_against: int,
                           opponent_elo: float, match_date: str):
    """Append one EWM-updated row to team_rolling_stats.csv for the given team."""
    path = BASE_DIR / "data/processed/team_rolling_stats.csv"
    stats = pd.read_csv(path, parse_dates=["date"])

    opp_weight   = opponent_elo / 1500.0
    weighted_gf  = goals_for    * opp_weight
    weighted_ga  = goals_against * opp_weight
    win          = 1.0 if goals_for > goals_against else (0.5 if goals_for == goals_against else 0.0)
    gdiff        = float(goals_for - goals_against)

    team_rows = stats[stats["team"] == team].sort_values("date")
    if team_rows.empty:
        return  # no prior stats — skip rather than invent a baseline

    prev = team_rows.iloc[-1]
    new_attack        = float(prev["attack"])        * (1 - EWM_ALPHA)       + weighted_gf * EWM_ALPHA
    new_defense       = float(prev["defense"])       * (1 - EWM_ALPHA)       + weighted_ga * EWM_ALPHA
    new_attack_short  = float(prev.get("attack_short",  prev["attack"]))  * (1 - EWM_ALPHA_SHORT) + weighted_gf * EWM_ALPHA_SHORT
    new_defense_short = float(prev.get("defense_short", prev["defense"])) * (1 - EWM_ALPHA_SHORT) + weighted_ga * EWM_ALPHA_SHORT
    new_win_rate      = float(prev.get("win_rate",  0.4)) * (1 - EWM_ALPHA) + win   * EWM_ALPHA
    new_goal_diff     = float(prev.get("goal_diff", 0.0)) * (1 - EWM_ALPHA) + gdiff * EWM_ALPHA

    new_row = pd.DataFrame([{
        "date":          match_date,
        "team":          team,
        "attack":        new_attack,
        "defense":       new_defense,
        "attack_short":  new_attack_short,
        "defense_short": new_defense_short,
        "win_rate":      new_win_rate,
        "goal_diff":     new_goal_diff,
    }])
    pd.concat([stats, new_row], ignore_index=True).to_csv(path, index=False)


_ROLLING_COLS = ["attack", "defense", "attack_short", "defense_short", "win_rate", "goal_diff"]

_last_synced_mtime = None


def sync_elos_from_fixtures(force: bool = False):
    """Recompute elo_current.csv and team_rolling_stats.csv from their base snapshots
    plus all results in wc2026_fixtures.csv, replayed in chronological (Match Number) order.

    Both files are fully rebuilt so neither can drift from the committed source of truth —
    mirrors how elo_current.csv already self-heals, but now covers the rolling
    attack/defense/win_rate/goal_diff features too, instead of relying on whatever
    register_result() happened to append to disk over time.

    The replay is O(all matches played) plus two CSV rewrites, so it's skipped whenever
    wc2026_fixtures.csv hasn't changed since the last call (checked via mtime) — otherwise
    every /fixtures request would redo the full-tournament replay from scratch.
    """
    global _last_synced_mtime
    fixtures_path = BASE_DIR / "data/raw/wc2026_fixtures.csv"
    mtime = fixtures_path.stat().st_mtime
    if not force and mtime == _last_synced_mtime:
        return
    _last_synced_mtime = mtime

    elo = pd.read_csv(BASE_DIR / "data/processed/elo_base.csv")
    rolling_base = pd.read_csv(BASE_DIR / "data/processed/team_rolling_stats_base.csv", parse_dates=["date"])
    fixtures = pd.read_csv(fixtures_path)
    fixtures = fixtures.sort_values("Match Number")

    k = K_FACTORS["WORLD_CUP"]

    # Seed rolling state from each team's most recent base (pre-tournament) row.
    latest_base = rolling_base.sort_values("date").groupby("team").last()
    rolling_state = {team: {c: float(latest_base.loc[team, c]) for c in _ROLLING_COLS}
                      for team in latest_base.index}
    new_rolling_rows = []

    for _, row in fixtures.iterrows():
        if pd.isna(row["Result"]) or str(row["Result"]).strip() == "":
            continue
        try:
            home_score, away_score = [int(x) for x in str(row["Result"]).split("-")]
        except Exception:
            continue

        home_team = name_map.get(row["Home Team"], row["Home Team"])
        away_team = name_map.get(row["Away Team"], row["Away Team"])

        home_mask = elo["team"] == home_team
        away_mask = elo["team"] == away_team
        if not home_mask.any() or not away_mask.any():
            continue

        home_elo = elo.loc[home_mask, "elo"].values[0]
        away_elo = elo.loc[away_mask, "elo"].values[0]

        # Rolling stats update — weighted by each side's PRE-MATCH opponent Elo,
        # same as the incremental update in register_result()/_update_rolling_stats().
        match_date = pd.to_datetime(str(row["Date"]).split()[0], dayfirst=True)
        for team, gf, ga, opp_elo in (
            (home_team, home_score, away_score, away_elo),
            (away_team, away_score, home_score, home_elo),
        ):
            prev = rolling_state.get(team)
            if prev is None:
                continue  # no prior history — skip, same as _update_rolling_stats()

            opp_weight  = opp_elo / 1500.0
            weighted_gf = gf * opp_weight
            weighted_ga = ga * opp_weight
            win   = 1.0 if gf > ga else (0.5 if gf == ga else 0.0)
            gdiff = float(gf - ga)

            new_stats = {
                "attack":        prev["attack"]        * (1 - EWM_ALPHA)       + weighted_gf * EWM_ALPHA,
                "defense":       prev["defense"]       * (1 - EWM_ALPHA)       + weighted_ga * EWM_ALPHA,
                "attack_short":  prev["attack_short"]  * (1 - EWM_ALPHA_SHORT) + weighted_gf * EWM_ALPHA_SHORT,
                "defense_short": prev["defense_short"] * (1 - EWM_ALPHA_SHORT) + weighted_ga * EWM_ALPHA_SHORT,
                "win_rate":      prev["win_rate"]      * (1 - EWM_ALPHA)       + win   * EWM_ALPHA,
                "goal_diff":     prev["goal_diff"]     * (1 - EWM_ALPHA)       + gdiff * EWM_ALPHA,
            }
            rolling_state[team] = new_stats
            new_rolling_rows.append({"date": match_date, "team": team, **new_stats})

        exp_home = expected_score(home_elo, away_elo)
        exp_away = expected_score(away_elo, home_elo)

        pens = str(row.get("Penalties", "")) if pd.notna(row.get("Penalties")) else ""
        home_pens = away_pens = None
        if "-" in pens:
            try:
                home_pens, away_pens = [int(x) for x in pens.split("-")]
            except Exception:
                pass

        goal_diff = abs(home_score - away_score)
        # A shootout only happens after a drawn scoreline (goal_diff == 0), which would
        # otherwise zero out mov and erase the winner's ELO gain — treat it as a 1-goal margin.
        pens_decide = goal_diff == 0 and home_pens is not None and away_pens is not None and home_pens != away_pens
        mov = np.log(2) if pens_decide else np.log(goal_diff + 1)

        if home_score > away_score:
            actual_home, actual_away = 1.0, 0.0
        elif home_score < away_score:
            actual_home, actual_away = 0.0, 1.0
        elif pens_decide:
            actual_home, actual_away = (1.0, 0.0) if home_pens > away_pens else (0.0, 1.0)
        else:
            actual_home, actual_away = 0.5, 0.5

        elo.loc[home_mask, "elo"] = update_elo(home_elo, exp_home, actual_home, k, mov)
        elo.loc[away_mask, "elo"] = update_elo(away_elo, exp_away, actual_away, k, mov)

    elo.to_csv(BASE_DIR / "data/processed/elo_current.csv", index=False)

    rolling_full = (
        pd.concat([rolling_base, pd.DataFrame(new_rolling_rows)], ignore_index=True)
        if new_rolling_rows else rolling_base
    )
    rolling_full.to_csv(BASE_DIR / "data/processed/team_rolling_stats.csv", index=False)


def expected_score(rating_a, rating_b):
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def update_elo(rating, expected, actual, k, mov):
    return rating + k * mov * (actual - expected)


def register_result(match_number: int, home_score: int, away_score: int,
                     home_pens: int = None, away_pens: int = None):
    """Update fixtures CSV and elo_current.csv after a match is played.

    home_score/away_score must be the 90-/120-minute goal count only — never include
    penalty-shootout kicks, since those goals also drive the rolling attack/defense
    stats and the goals-vs-xG comparisons. If the match was decided on penalties,
    pass home_pens/away_pens separately; they only affect which side counts as the
    ELO winner, not the recorded scoreline.
    """

    fixtures_path = BASE_DIR / "data/raw/wc2026_fixtures.csv"
    elo_path = BASE_DIR / "data/processed/elo_current.csv"

    fixtures = pd.read_csv(fixtures_path)
    elo_current = pd.read_csv(elo_path)

    # Find the match
    mask = fixtures["Match Number"] == match_number
    if not mask.any():
        raise ValueError(f"Match {match_number} not found")

    row = fixtures[mask].iloc[0]
    home_team = name_map.get(row["Home Team"], row["Home Team"])
    away_team = name_map.get(row["Away Team"], row["Away Team"])

    # Get current Elo
    home_elo = elo_current.loc[elo_current["team"] == home_team, "elo"].values[0]
    away_elo = elo_current.loc[elo_current["team"] == away_team, "elo"].values[0]

    # All WC matches are neutral
    exp_home = expected_score(home_elo, away_elo)
    exp_away = expected_score(away_elo, home_elo)

    goal_diff = abs(home_score - away_score)
    # A shootout only happens after a drawn scoreline (goal_diff == 0), which would
    # otherwise zero out mov and erase the winner's ELO gain — treat it as a 1-goal margin.
    pens_decide = goal_diff == 0 and home_pens is not None and away_pens is not None and home_pens != away_pens
    mov = np.log(2) if pens_decide else (np.log(goal_diff + 1) if goal_diff > 0 else np.log(1))

    if home_score > away_score:
        actual_home, actual_away = 1.0, 0.0
    elif home_score < away_score:
        actual_home, actual_away = 0.0, 1.0
    elif pens_decide:
        actual_home, actual_away = (1.0, 0.0) if home_pens > away_pens else (0.0, 1.0)
    else:
        actual_home, actual_away = 0.5, 0.5

    k = K_FACTORS["WORLD_CUP"]
    new_home_elo = update_elo(home_elo, exp_home, actual_home, k, mov)
    new_away_elo = update_elo(away_elo, exp_away, actual_away, k, mov)

    # Update elo_current.csv
    elo_current.loc[elo_current["team"] == home_team, "elo"] = new_home_elo
    elo_current.loc[elo_current["team"] == away_team, "elo"] = new_away_elo
    elo_current.to_csv(elo_path, index=False)

    # Update rolling attack/defense stats for both teams
    match_date = pd.to_datetime(str(row["Date"]).split()[0], dayfirst=True).strftime("%Y-%m-%d")
    _update_rolling_stats(home_team, home_score, away_score, away_elo, match_date)
    _update_rolling_stats(away_team, away_score, home_score, home_elo, match_date)

    # Update result in fixtures (cast to object first so string assignment works on an all-null column)
    fixtures["Result"] = fixtures["Result"].astype(object)
    fixtures.loc[mask, "Result"] = f"{home_score} - {away_score}"
    if home_pens is not None and away_pens is not None:
        fixtures["Penalties"] = fixtures["Penalties"].astype(object)
        fixtures.loc[mask, "Penalties"] = f"{home_pens} - {away_pens}"
    fixtures.to_csv(fixtures_path, index=False)

    return {
        "home_team": row["Home Team"],
        "away_team": row["Away Team"],
        "result": f"{home_score} - {away_score}",
        "home_elo_before": round(home_elo),
        "away_elo_before": round(away_elo),
        "home_elo_after": round(new_home_elo),
        "away_elo_after": round(new_away_elo),
    }
