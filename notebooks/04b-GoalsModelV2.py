import pandas as pd
import numpy as np
from sklearn.linear_model import PoissonRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
EWM_SPAN = 10

matches = pd.read_csv(BASE_DIR / 'data/processed/matches_clean.csv', parse_dates=['date'])
elo     = pd.read_csv(BASE_DIR / 'data/processed/elo_history.csv',   parse_dates=['date'])

matches = (
    matches
    .dropna(subset=['home_score', 'away_score'])
    .sort_values('date')
    .reset_index(drop=True)
)
# Post-2010 only: modern football is structurally different
matches = matches[matches['date'] >= '2010-01-01'].reset_index(drop=True)

# Bring in pre-match ELOs for opponent-quality weighting
matches = matches.merge(
    elo[['date', 'home_team', 'away_team', 'home_elo_pre', 'away_elo_pre', 'elo_diff']],
    on=['date', 'home_team', 'away_team'],
    how='inner',
)

# One row per team per match, with opponent ELO attached
home_view = matches[['date', 'home_team', 'home_score', 'away_score', 'away_elo_pre']].copy()
home_view.columns = ['date', 'team', 'goals_for', 'goals_against', 'opponent_elo']

away_view = matches[['date', 'away_team', 'away_score', 'home_score', 'home_elo_pre']].copy()
away_view.columns = ['date', 'team', 'goals_for', 'goals_against', 'opponent_elo']

team_matches = (
    pd.concat([home_view, away_view])
    .sort_values(['team', 'date'])
    .reset_index(drop=True)
)

# Opponent-quality weight: goals vs a 1700-ELO side count more than vs a 1300-ELO side
team_matches['opp_weight']   = team_matches['opponent_elo'] / 1500.0
team_matches['weighted_gf']  = team_matches['goals_for']     * team_matches['opp_weight']
team_matches['weighted_ga']  = team_matches['goals_against'] * team_matches['opp_weight']

# Exponential weighted mean (shift=1 to prevent leakage)
team_matches['attack']  = team_matches.groupby('team')['weighted_gf'].transform(
    lambda x: x.shift(1).ewm(span=EWM_SPAN, min_periods=3).mean()
)
team_matches['defense'] = team_matches.groupby('team')['weighted_ga'].transform(
    lambda x: x.shift(1).ewm(span=EWM_SPAN, min_periods=3).mean()
)

team_stats = team_matches[['date', 'team', 'attack', 'defense']].dropna()

# Merge rolling stats back onto matches
matches2 = matches.merge(
    team_stats.rename(columns={'team': 'home_team', 'attack': 'home_attack', 'defense': 'home_defense'}),
    on=['date', 'home_team'],
    how='inner',
).merge(
    team_stats.rename(columns={'team': 'away_team', 'attack': 'away_attack', 'defense': 'away_defense'}),
    on=['date', 'away_team'],
    how='inner',
)
matches2 = matches2.dropna(subset=['home_attack', 'away_attack', 'elo_diff'])

print(f"Training on {len(matches2)} matches ({matches2['date'].min().date()} – {matches2['date'].max().date()})")

feature_cols = ['home_attack', 'home_defense', 'away_attack', 'away_defense', 'elo_diff']

train = matches2[matches2['date'] < '2020-01-01']
test  = matches2[matches2['date'] >= '2020-01-01']

scaler = StandardScaler()
X_train = scaler.fit_transform(train[feature_cols])
X_test  = scaler.transform(test[feature_cols])

model_home = PoissonRegressor(alpha=0, max_iter=300)
model_home.fit(X_train, train['home_score'])

model_away = PoissonRegressor(alpha=0, max_iter=300)
model_away.fit(X_train, train['away_score'])

mae_home = mean_absolute_error(test['home_score'], model_home.predict(X_test))
mae_away = mean_absolute_error(test['away_score'], model_away.predict(X_test))
print(f"MAE home: {mae_home:.4f}  |  MAE away: {mae_away:.4f}")

joblib.dump(model_home, BASE_DIR / 'models/model_home.pkl')
joblib.dump(model_away, BASE_DIR / 'models/model_away.pkl')
joblib.dump(scaler,     BASE_DIR / 'models/scaler.pkl')

team_stats.to_csv(BASE_DIR / 'data/processed/team_rolling_stats.csv', index=False)
print("Models and rolling stats saved.")
