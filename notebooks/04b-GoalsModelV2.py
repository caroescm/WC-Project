import pandas as pd
import numpy as np
from sklearn.linear_model import PoissonRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent.parent
EWM_SPAN_LONG  = 10
EWM_SPAN_SHORT = 5
H2H_YEARS      = 12

matches = pd.read_csv(BASE_DIR / 'data/processed/matches_clean.csv', parse_dates=['date'])
elo     = pd.read_csv(BASE_DIR / 'data/processed/elo_history.csv',   parse_dates=['date'])

# WC 2026 teams (canonical names)
WC_TEAMS = {
    'Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium',
    'Bosnia and Herzegovina', 'Brazil', 'Canada', 'Cape Verde', 'Colombia',
    'Croatia', 'Czech Republic', 'DR Congo', 'Ecuador', 'Egypt', 'England',
    'France', 'Germany', 'Ghana', 'Haiti', 'Iran', 'Iraq', 'Ivory Coast',
    'Japan', 'Jordan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
    'Norway', 'Panama', 'Paraguay', 'Portugal', 'Qatar', 'Saudi Arabia',
    'Scotland', 'Senegal', 'South Africa', 'South Korea', 'Spain', 'Sweden',
    'Switzerland', 'Tunisia', 'Turkey', 'United States', 'Uruguay', 'Uzbekistan',
    'Curaçao',
}

matches = (
    matches
    .dropna(subset=['home_score', 'away_score'])
    .sort_values('date')
    .reset_index(drop=True)
)
# Filter to 2016+ and only matches involving at least one WC 2026 team
matches = matches[
    (matches['date'] >= '2016-01-01') &
    (matches['home_team'].isin(WC_TEAMS) | matches['away_team'].isin(WC_TEAMS))
].reset_index(drop=True)

matches = matches.merge(
    elo[['date', 'home_team', 'away_team', 'home_elo_pre', 'away_elo_pre', 'elo_diff']],
    on=['date', 'home_team', 'away_team'],
    how='inner',
)

# ── Rolling attack / defense (long + short span) ─────────────────────────────
home_view = matches[['date', 'home_team', 'home_score', 'away_score', 'away_elo_pre']].copy()
home_view.columns = ['date', 'team', 'goals_for', 'goals_against', 'opponent_elo']
away_view = matches[['date', 'away_team', 'away_score', 'home_score', 'home_elo_pre']].copy()
away_view.columns = ['date', 'team', 'goals_for', 'goals_against', 'opponent_elo']

team_matches = (
    pd.concat([home_view, away_view])
    .sort_values(['team', 'date'])
    .reset_index(drop=True)
)

team_matches['opp_weight']  = team_matches['opponent_elo'] / 1500.0
team_matches['weighted_gf'] = team_matches['goals_for']     * team_matches['opp_weight']
team_matches['weighted_ga'] = team_matches['goals_against'] * team_matches['opp_weight']
team_matches['win']         = (team_matches['goals_for'] > team_matches['goals_against']).astype(float)
team_matches.loc[team_matches['goals_for'] == team_matches['goals_against'], 'win'] = 0.5
team_matches['gdiff']       = team_matches['goals_for'] - team_matches['goals_against']

grp = team_matches.groupby('team')
team_matches['attack']        = grp['weighted_gf'].transform(lambda x: x.shift(1).ewm(span=EWM_SPAN_LONG,  min_periods=3).mean())
team_matches['defense']       = grp['weighted_ga'].transform(lambda x: x.shift(1).ewm(span=EWM_SPAN_LONG,  min_periods=3).mean())
team_matches['attack_short']  = grp['weighted_gf'].transform(lambda x: x.shift(1).ewm(span=EWM_SPAN_SHORT, min_periods=2).mean())
team_matches['defense_short'] = grp['weighted_ga'].transform(lambda x: x.shift(1).ewm(span=EWM_SPAN_SHORT, min_periods=2).mean())
team_matches['win_rate']      = grp['win'].transform(         lambda x: x.shift(1).ewm(span=EWM_SPAN_LONG,  min_periods=3).mean())
team_matches['goal_diff']     = grp['gdiff'].transform(       lambda x: x.shift(1).ewm(span=EWM_SPAN_LONG,  min_periods=3).mean())

team_stats = team_matches[['date', 'team', 'attack', 'defense',
                            'attack_short', 'defense_short', 'win_rate', 'goal_diff']].dropna()

# ── Merge rolling stats onto matches ─────────────────────────────────────────
matches2 = matches.merge(
    team_stats.rename(columns={'team': 'home_team', 'attack': 'home_attack', 'defense': 'home_defense',
                               'attack_short': 'home_attack_short', 'defense_short': 'home_defense_short',
                               'win_rate': 'home_win_rate', 'goal_diff': 'home_goal_diff'}),
    on=['date', 'home_team'], how='inner',
).merge(
    team_stats.rename(columns={'team': 'away_team', 'attack': 'away_attack', 'defense': 'away_defense',
                               'attack_short': 'away_attack_short', 'defense_short': 'away_defense_short',
                               'win_rate': 'away_win_rate', 'goal_diff': 'away_goal_diff'}),
    on=['date', 'away_team'], how='inner',
)
matches2 = matches2.dropna(subset=['home_attack', 'away_attack', 'elo_diff'])

# ── H2H win rate (home team's win rate vs this specific away team) ───────────
print("Computing H2H features...")
matches2 = matches2.sort_values('date').reset_index(drop=True)
H2H_TD = pd.Timedelta(days=365 * H2H_YEARS)

history = defaultdict(list)  # (home, away) -> [(date, result_for_home)]
h2h_rates = []

for _, row in matches2.iterrows():
    ht, at, date = row['home_team'], row['away_team'], row['date']
    results = []
    for d, r in history.get((ht, at), []):
        if (date - d) <= H2H_TD:
            results.append(r)
    for d, r in history.get((at, ht), []):
        if (date - d) <= H2H_TD:
            results.append(1.0 - r)
    h2h_rates.append(np.mean(results) if len(results) >= 2 else 0.5)
    result = 1.0 if row['home_score'] > row['away_score'] else (0.5 if row['home_score'] == row['away_score'] else 0.0)
    history[(ht, at)].append((date, result))

matches2['h2h_home_win_rate'] = h2h_rates

# ── ELO² for non-linear quality gap ─────────────────────────────────────────
matches2['elo_diff_sq'] = matches2['elo_diff'] ** 2 * np.sign(matches2['elo_diff'])

print(f"Training on {len(matches2)} matches ({matches2['date'].min().date()} – {matches2['date'].max().date()})")

feature_cols = [
    'home_attack', 'home_defense', 'away_attack', 'away_defense', 'elo_diff',
    'home_attack_short', 'home_defense_short', 'away_attack_short', 'away_defense_short',
    'home_win_rate', 'away_win_rate', 'home_goal_diff', 'away_goal_diff',
    'h2h_home_win_rate', 'elo_diff_sq',
]

train = matches2[matches2['date'] < '2020-01-01']
test  = matches2[matches2['date'] >= '2020-01-01']

scaler  = StandardScaler()
X_train = scaler.fit_transform(train[feature_cols])
X_test  = scaler.transform(test[feature_cols])

model_home = PoissonRegressor(alpha=0.1, max_iter=500)
model_home.fit(X_train, train['home_score'])

model_away = PoissonRegressor(alpha=0.1, max_iter=500)
model_away.fit(X_train, train['away_score'])

mae_home = mean_absolute_error(test['home_score'], model_home.predict(X_test))
mae_away = mean_absolute_error(test['away_score'], model_away.predict(X_test))
print(f"MAE home: {mae_home:.4f}  |  MAE away: {mae_away:.4f}")

joblib.dump(model_home,    BASE_DIR / 'models/model_home.pkl')
joblib.dump(model_away,    BASE_DIR / 'models/model_away.pkl')
joblib.dump(scaler,        BASE_DIR / 'models/scaler.pkl')
joblib.dump(feature_cols,  BASE_DIR / 'models/feature_cols.pkl')

team_stats.to_csv(BASE_DIR / 'data/processed/team_rolling_stats.csv', index=False)
print("Models, scaler, feature list, and rolling stats saved.")
