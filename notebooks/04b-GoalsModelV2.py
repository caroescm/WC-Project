import pandas as pd
import numpy as np
from sklearn.linear_model import PoissonRegressor
from sklearn.metrics import mean_absolute_error
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
N = 10

matches = pd.read_csv(BASE_DIR / 'data/processed/matches_clean.csv', parse_dates=['date'])
matches = matches.dropna(subset=['home_score', 'away_score']).sort_values('date').reset_index(drop=True)

# Build a team-match view (one row per team per match)
home_view = matches[['date','home_team','home_score','away_score']].copy()
home_view.columns = ['date','team','goals_for','goals_against']

away_view = matches[['date','away_team','away_score','home_score']].copy()
away_view.columns = ['date','team','goals_for','goals_against']

team_matches = pd.concat([home_view, away_view]).sort_values(['team','date']).reset_index(drop=True)

# Rolling mean per team (shift to avoid leakage)
team_matches['attack'] = team_matches.groupby('team')['goals_for'].transform(
    lambda x: x.shift(1).rolling(N, min_periods=3).mean()
)
team_matches['defense'] = team_matches.groupby('team')['goals_against'].transform(
    lambda x: x.shift(1).rolling(N, min_periods=3).mean()
)

team_stats = team_matches[['date','team','attack','defense']].dropna()

# Merge back onto matches
matches2 = matches.merge(
    team_stats.rename(columns={'team':'home_team','attack':'home_attack','defense':'home_defense'}),
    on=['date','home_team'], how='inner'
).merge(
    team_stats.rename(columns={'team':'away_team','attack':'away_attack','defense':'away_defense'}),
    on=['date','away_team'], how='inner'
)

# Add elo_diff
elo = pd.read_csv(BASE_DIR / 'data/processed/elo_history.csv', parse_dates=['date'])
matches2 = matches2.merge(elo[['date','home_team','away_team','elo_diff']], on=['date','home_team','away_team'], how='inner')
matches2 = matches2.dropna(subset=['home_attack','away_attack','elo_diff'])

print(f"Training on {len(matches2)} matches")

feature_cols = ['home_attack','home_defense','away_attack','away_defense','elo_diff']

train = matches2[matches2['date'] < '2020-01-01']
test  = matches2[matches2['date'] >= '2020-01-01']

model_home = PoissonRegressor(max_iter=300)
model_home.fit(train[feature_cols], train['home_score'])

model_away = PoissonRegressor(max_iter=300)
model_away.fit(train[feature_cols], train['away_score'])

mae_home = mean_absolute_error(test['home_score'], model_home.predict(test[feature_cols]))
mae_away = mean_absolute_error(test['away_score'], model_away.predict(test[feature_cols]))
print(f"MAE home: {mae_home:.4f}")
print(f"MAE away: {mae_away:.4f}")

joblib.dump(model_home, BASE_DIR / 'models/model_home.pkl')
joblib.dump(model_away, BASE_DIR / 'models/model_away.pkl')

# Save team stats for use in predict.py
team_stats.to_csv(BASE_DIR / 'data/processed/team_rolling_stats.csv', index=False)
print("Done.")
