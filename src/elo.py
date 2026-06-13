import numpy as np
import pandas as pd
from pathlib import Path
from config import K_FACTORS

BASE_DIR = Path(__file__).parent.parent
HOME_ADVANTAGE = 100


def expected_score(rating_a, rating_b):
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def update_elo(rating, expected, actual, k, mov):
    return rating + k * mov * (actual - expected)


def register_result(match_number: int, home_score: int, away_score: int):
    """Update fixtures CSV and elo_current.csv after a match is played."""

    fixtures_path = BASE_DIR / "data/raw/wc2026_fixtures.csv"
    elo_path = BASE_DIR / "data/processed/elo_current.csv"

    fixtures = pd.read_csv(fixtures_path)
    elo_current = pd.read_csv(elo_path)

    # Find the match
    mask = fixtures["Match Number"] == match_number
    if not mask.any():
        raise ValueError(f"Match {match_number} not found")

    row = fixtures[mask].iloc[0]
    from config import name_map
    home_team = name_map.get(row["Home Team"], row["Home Team"])
    away_team = name_map.get(row["Away Team"], row["Away Team"])

    # Get current Elo
    home_elo = elo_current.loc[elo_current["team"] == home_team, "elo"].values[0]
    away_elo = elo_current.loc[elo_current["team"] == away_team, "elo"].values[0]

    # All WC matches are neutral
    exp_home = expected_score(home_elo, away_elo)
    exp_away = expected_score(away_elo, home_elo)

    goal_diff = abs(home_score - away_score)
    mov = np.log(goal_diff + 1) if goal_diff > 0 else np.log(1)

    if home_score > away_score:
        actual_home, actual_away = 1.0, 0.0
    elif home_score < away_score:
        actual_home, actual_away = 0.0, 1.0
    else:
        actual_home, actual_away = 0.5, 0.5

    k = K_FACTORS["WORLD_CUP"]
    new_home_elo = update_elo(home_elo, exp_home, actual_home, k, mov)
    new_away_elo = update_elo(away_elo, exp_away, actual_away, k, mov)

    # Update elo_current.csv
    elo_current.loc[elo_current["team"] == home_team, "elo"] = new_home_elo
    elo_current.loc[elo_current["team"] == away_team, "elo"] = new_away_elo
    elo_current.to_csv(elo_path, index=False)

    # Update result in fixtures
    fixtures.loc[mask, "Result"] = f"{home_score} - {away_score}"
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
