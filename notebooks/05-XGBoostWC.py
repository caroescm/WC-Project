"""
Train an XGBoost classifier on World Cup 2006-2022 matches.

Uses team-level features from train.csv joined with Poisson-derived rolling stats
and ELO history. Learns the non-linear relationship between team quality gaps
and match outcome (HOME_WIN / DRAW / AWAY_WIN).

Output:
  models/model_xgb_wc.pkl
  models/xgb_scaler.pkl
  models/xgb_feature_cols.pkl
"""

import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

TRAIN_CSV   = Path('/Users/carolinaescudero/Downloads/archive (1) 2/train.csv')
MATCHES_CSV = ROOT / 'data/processed/matches_clean.csv'
ELO_CSV     = ROOT / 'data/processed/elo_history.csv'
ROLLING_CSV = ROOT / 'data/processed/team_rolling_stats.csv'

train   = pd.read_csv(TRAIN_CSV)
matches = pd.read_csv(MATCHES_CSV, parse_dates=['date'])
elo_h   = pd.read_csv(ELO_CSV,     parse_dates=['date'])
rolling = pd.read_csv(ROLLING_CSV, parse_dates=['date'])

# Latest rolling stats per team (pre-WC 2026, i.e. before June 2026)
latest_rolling = (
    rolling[rolling['date'] < '2026-06-01']
    .sort_values('date')
    .groupby('team')
    .last()
    .reset_index()
)

# ── Filter to FIFA World Cup matches 2006-2022 ───────────────────────────────
wc = matches[
    (matches['tournament'] == 'FIFA World Cup') &
    (matches['date'].dt.year.isin([2006, 2010, 2014, 2018, 2022]))
].copy()
wc = wc.merge(
    elo_h[['date', 'home_team', 'away_team', 'home_elo_pre', 'away_elo_pre', 'elo_diff']],
    on=['date', 'home_team', 'away_team'], how='inner',
)
wc['wc_year'] = wc['date'].dt.year

# ── Map team features from train.csv ─────────────────────────────────────────
team_feat_cols = [
    'squad_total_market_value_eur', 'fifa_rank_pre_tournament',
    'wins_last_4y', 'losses_last_4y', 'draws_last_4y',
    'world_cup_titles_before', 'world_cup_participations_before',
]
train_clean = train[['version', 'team'] + team_feat_cols].dropna()

def join_team_features(df, team_col, year_col, prefix):
    merged = df.merge(
        train_clean.rename(columns={'version': year_col, 'team': team_col}),
        on=[year_col, team_col], how='left',
    )
    merged = merged.rename(columns={c: f'{prefix}_{c}' for c in team_feat_cols})
    return merged

wc = join_team_features(wc, 'home_team', 'wc_year', 'home')
wc = join_team_features(wc, 'away_team', 'wc_year', 'away')

# Drop rows where team features are missing (teams not in train.csv)
feat_check = [f'home_{c}' for c in team_feat_cols] + [f'away_{c}' for c in team_feat_cols]
wc = wc.dropna(subset=feat_check)

# ── Derived team-diff features ────────────────────────────────────────────────
wc['market_value_log_diff'] = (
    np.log(wc['home_squad_total_market_value_eur'] + 1) -
    np.log(wc['away_squad_total_market_value_eur'] + 1)
)
wc['fifa_rank_diff'] = wc['away_fifa_rank_pre_tournament'] - wc['home_fifa_rank_pre_tournament']  # higher = home is better

home_total = wc['home_wins_last_4y'] + wc['home_losses_last_4y'] + wc['home_draws_last_4y']
away_total = wc['away_wins_last_4y'] + wc['away_losses_last_4y'] + wc['away_draws_last_4y']
wc['home_wins_4y_rate'] = wc['home_wins_last_4y'] / home_total.clip(lower=1)
wc['away_wins_4y_rate'] = wc['away_wins_last_4y'] / away_total.clip(lower=1)
wc['wins_4y_rate_diff'] = wc['home_wins_4y_rate'] - wc['away_wins_4y_rate']
wc['wc_titles_diff']    = wc['home_world_cup_titles_before'] - wc['away_world_cup_titles_before']
wc['wc_parts_diff']     = wc['home_world_cup_participations_before'] - wc['away_world_cup_participations_before']
wc['elo_diff_sq']       = wc['elo_diff'] ** 2 * np.sign(wc['elo_diff'])

# ── Target ────────────────────────────────────────────────────────────────────
def to_label(row):
    if row['home_score'] > row['away_score']:
        return 2   # HOME_WIN
    elif row['home_score'] == row['away_score']:
        return 1   # DRAW
    else:
        return 0   # AWAY_WIN

wc['label'] = wc.apply(to_label, axis=1)

XGB_FEATURE_COLS = [
    'elo_diff', 'elo_diff_sq',
    'market_value_log_diff', 'fifa_rank_diff',
    'wins_4y_rate_diff', 'wc_titles_diff', 'wc_parts_diff',
]

wc_clean = wc.dropna(subset=XGB_FEATURE_COLS + ['label'])
X = wc_clean[XGB_FEATURE_COLS].values
y = wc_clean['label'].values

xgb_scaler = StandardScaler()
X_sc = xgb_scaler.fit_transform(X)

model_xgb = XGBClassifier(
    n_estimators=150,
    max_depth=3,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_lambda=2.0,
    reg_alpha=0.5,
    objective='multi:softprob',
    num_class=3,
    eval_metric='mlogloss',
    random_state=42,
    verbosity=0,
)
model_xgb.fit(X_sc, y)

cv_scores = cross_val_score(model_xgb, X_sc, y, cv=5, scoring='accuracy')
print(f"XGBoost WC model trained on {len(wc_clean)} matches")
print(f"CV accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
print(f"Class distribution: AWAY={sum(y==0)} DRAW={sum(y==1)} HOME={sum(y==2)}")

joblib.dump(model_xgb,       ROOT / 'models/model_xgb_wc.pkl')
joblib.dump(xgb_scaler,      ROOT / 'models/xgb_scaler.pkl')
joblib.dump(XGB_FEATURE_COLS, ROOT / 'models/xgb_feature_cols.pkl')
print("XGBoost model, scaler, and feature list saved.")
