import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from scipy.stats import poisson

BASE_DIR = Path(__file__).parent.parent

model_home = joblib.load(BASE_DIR / 'models/model_home.pkl')
model_away = joblib.load(BASE_DIR / 'models/model_away.pkl')
scaler     = joblib.load(BASE_DIR / 'models/scaler.pkl')

elo_current = pd.read_csv(BASE_DIR / 'data/processed/elo_current.csv')
rolling     = pd.read_csv(BASE_DIR / 'data/processed/team_rolling_stats.csv', parse_dates=['date'])

_latest_stats = (
    rolling.sort_values('date')
           .groupby('team')
           .last()
           [['attack', 'defense']]
)

_FALLBACK_ATTACK  = 1.5
_FALLBACK_DEFENSE = 1.1


def _team_stats(team: str):
    if team in _latest_stats.index:
        row = _latest_stats.loc[team]
        return float(row['attack']), float(row['defense'])
    return _FALLBACK_ATTACK, _FALLBACK_DEFENSE


def predicting(home_team: str, away_team: str, neutral: bool = True):
    home_elo = float(elo_current.loc[elo_current['team'] == home_team, 'elo'].values[0])
    away_elo = float(elo_current.loc[elo_current['team'] == away_team, 'elo'].values[0])
    elo_diff = home_elo - away_elo

    home_attack, home_defense = _team_stats(home_team)
    away_attack, away_defense = _team_stats(away_team)

    feature_cols = ['home_attack', 'home_defense', 'away_attack', 'away_defense', 'elo_diff']
    features = scaler.transform(
        pd.DataFrame([[home_attack, home_defense, away_attack, away_defense, elo_diff]], columns=feature_cols)
    )

    lambda_home = float(model_home.predict(features)[0])
    lambda_away = float(model_away.predict(features)[0])

    goals = np.arange(11)
    prob_home = poisson.pmf(goals, lambda_home)
    prob_away = poisson.pmf(goals, lambda_away)
    joint = np.outer(prob_home, prob_away)

    home_win = float(np.tril(joint, -1).sum())
    draw     = float(np.trace(joint))
    away_win = float(np.triu(joint,  1).sum())

    return {
        'HOME_WIN':  round(home_win, 4),
        'DRAW':      round(draw,     4),
        'AWAY_WIN':  round(away_win, 4),
        'home_elo':  round(home_elo),
        'away_elo':  round(away_elo),
        'home_xg':   round(lambda_home, 3),
        'away_xg':   round(lambda_away, 3),
    }
