import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from scipy.stats import poisson
from collections import defaultdict
from .config import name_map

BASE_DIR = Path(__file__).parent.parent

model_home    = joblib.load(BASE_DIR / 'models/model_home.pkl')
model_away    = joblib.load(BASE_DIR / 'models/model_away.pkl')
scaler        = joblib.load(BASE_DIR / 'models/scaler.pkl')
feature_cols  = joblib.load(BASE_DIR / 'models/feature_cols.pkl')
model_xgb     = joblib.load(BASE_DIR / 'models/model_xgb_wc.pkl')
xgb_scaler    = joblib.load(BASE_DIR / 'models/xgb_scaler.pkl')
xgb_feat_cols = joblib.load(BASE_DIR / 'models/xgb_feature_cols.pkl')

elo_current   = pd.read_csv(BASE_DIR / 'data/processed/elo_current.csv')
rolling       = pd.read_csv(BASE_DIR / 'data/processed/team_rolling_stats.csv', parse_dates=['date'])
team_features = pd.read_csv(BASE_DIR / 'data/processed/team_features_2026.csv')

_ROLLING_COLS = ['attack', 'defense', 'attack_short', 'defense_short', 'win_rate', 'goal_diff']

_latest_stats = (
    rolling.sort_values('date')
           .groupby('team')
           .last()
           [_ROLLING_COLS]
)

_team_feat_index = team_features.set_index('team')

# Precompute H2H rates from recent international history + current WC results
_h2h = defaultdict(list)   # (home, away) -> list of result floats (1=home win, 0.5=draw, 0=away win)

def _build_h2h():
    global _h2h
    _h2h = defaultdict(list)
    H2H_TD = pd.Timedelta(days=365 * 12)
    try:
        hist = pd.read_csv(BASE_DIR / 'data/processed/matches_clean.csv', parse_dates=['date'])
        hist = hist[hist['date'] >= (pd.Timestamp.now() - H2H_TD)].dropna(subset=['home_score', 'away_score'])
        for _, r in hist.iterrows():
            res = 1.0 if r['home_score'] > r['away_score'] else (0.5 if r['home_score'] == r['away_score'] else 0.0)
            _h2h[(r['home_team'], r['away_team'])].append(res)
    except Exception:
        pass

_build_h2h()


def _h2h_rate(home: str, away: str) -> float:
    fwd = _h2h.get((home, away), [])
    rev = _h2h.get((away, home), [])
    results = list(fwd) + [1.0 - r for r in rev]
    return float(np.mean(results)) if len(results) >= 2 else 0.5


def reload_data():
    """Refresh Elo/rolling-stats globals after a new result. Doesn't touch H2H —
    that's built from matches_clean.csv, which only holds pre-tournament history
    and never changes at runtime, so re-parsing its 49k rows on every call would
    be pure overhead (see _build_h2h, called once at import time)."""
    global elo_current, rolling, _latest_stats, _team_feat_index
    elo_current   = pd.read_csv(BASE_DIR / 'data/processed/elo_current.csv')
    rolling       = pd.read_csv(BASE_DIR / 'data/processed/team_rolling_stats.csv', parse_dates=['date'])
    team_features = pd.read_csv(BASE_DIR / 'data/processed/team_features_2026.csv')
    _latest_stats = (
        rolling.sort_values('date')
               .groupby('team')
               .last()
               [_ROLLING_COLS]
    )
    _team_feat_index = team_features.set_index('team')


_FALLBACKS = {
    'attack':        1.50,
    'defense':       1.10,
    'attack_short':  1.50,
    'defense_short': 1.10,
    'win_rate':      0.40,
    'goal_diff':     0.00,
}


def _team_stats(team: str) -> dict:
    if team in _latest_stats.index:
        row = _latest_stats.loc[team]
        return {col: float(row[col]) if not pd.isna(row[col]) else _FALLBACKS[col]
                for col in _ROLLING_COLS}
    return dict(_FALLBACKS)


def _team_feat(team: str, col: str, default: float) -> float:
    if team in _team_feat_index.index:
        val = _team_feat_index.loc[team, col]
        return float(val) if not pd.isna(val) else default
    return default


def predicting(home_team: str, away_team: str, neutral: bool = True, knockout: bool = False):
    home_team = name_map.get(home_team, home_team)
    away_team = name_map.get(away_team, away_team)

    home_elo = float(elo_current.loc[elo_current['team'] == home_team, 'elo'].values[0])
    away_elo = float(elo_current.loc[elo_current['team'] == away_team, 'elo'].values[0])
    elo_diff = home_elo - away_elo

    hs = _team_stats(home_team)
    as_ = _team_stats(away_team)
    h2h = _h2h_rate(home_team, away_team)
    elo_diff_sq = elo_diff ** 2 * np.sign(elo_diff)

    def make_features(hstats, astats, diff, diff_sq, h2h_val):
        return pd.DataFrame([[
            hstats['attack'],        hstats['defense'],
            astats['attack'],        astats['defense'],
            diff,
            hstats['attack_short'],  hstats['defense_short'],
            astats['attack_short'],  astats['defense_short'],
            hstats['win_rate'],      astats['win_rate'],
            hstats['goal_diff'],     astats['goal_diff'],
            h2h_val,                 diff_sq,
        ]], columns=feature_cols)

    feat_normal  = make_features(hs, as_, elo_diff,  elo_diff_sq,  h2h)
    feat_flipped = make_features(as_, hs, -elo_diff, -elo_diff_sq, 1.0 - h2h)

    feat_n_sc = scaler.transform(feat_normal)
    feat_f_sc = scaler.transform(feat_flipped)

    if neutral:
        lambda_home = (float(model_home.predict(feat_n_sc)[0]) + float(model_away.predict(feat_f_sc)[0])) / 2
        lambda_away = (float(model_away.predict(feat_n_sc)[0]) + float(model_home.predict(feat_f_sc)[0])) / 2
    else:
        lambda_home = float(model_home.predict(feat_n_sc)[0])
        lambda_away = float(model_away.predict(feat_n_sc)[0])

    # Poisson score matrix + Dixon-Coles correction
    goals = np.arange(15)
    prob_home = poisson.pmf(goals, lambda_home)
    prob_away = poisson.pmf(goals, lambda_away)
    joint = np.outer(prob_home, prob_away)

    RHO = -0.13
    joint[0, 0] *= 1 - lambda_home * lambda_away * RHO
    joint[1, 0] *= 1 + lambda_away * RHO
    joint[0, 1] *= 1 + lambda_home * RHO
    joint[1, 1] *= 1 - RHO
    joint /= joint.sum()

    p_home_win = float(np.tril(joint, -1).sum())
    p_draw     = float(np.trace(joint))
    p_away_win = float(np.triu(joint,  1).sum())

    # XGBoost ensemble: team-level quality features
    home_mv_log = _team_feat(home_team, 'market_value_log', 19.0)
    away_mv_log = _team_feat(away_team, 'market_value_log', 19.0)
    home_rank   = _team_feat(home_team, 'fifa_rank_est', 40.0)
    away_rank   = _team_feat(away_team, 'fifa_rank_est', 40.0)
    home_w4y    = _team_feat(home_team, 'wins_4y_rate', 0.40)
    away_w4y    = _team_feat(away_team, 'wins_4y_rate', 0.40)
    home_titles = _team_feat(home_team, 'wc_titles', 0.0)
    away_titles = _team_feat(away_team, 'wc_titles', 0.0)
    home_parts  = _team_feat(home_team, 'wc_participations', 5.0)
    away_parts  = _team_feat(away_team, 'wc_participations', 5.0)

    xgb_raw = pd.DataFrame([[
        elo_diff,
        elo_diff_sq,
        home_mv_log - away_mv_log,
        away_rank   - home_rank,       # positive = home team has better rank
        home_w4y    - away_w4y,
        home_titles - away_titles,
        home_parts  - away_parts,
    ]], columns=xgb_feat_cols)

    xgb_probs = model_xgb.predict_proba(xgb_scaler.transform(xgb_raw.values))[0]
    # XGBoost classes: 0=AWAY_WIN, 1=DRAW, 2=HOME_WIN
    xgb_away  = float(xgb_probs[0])
    xgb_draw  = float(xgb_probs[1])
    xgb_home  = float(xgb_probs[2])

    # Ensemble: 60% Poisson (rich historical signal) + 40% XGBoost (WC-specific quality)
    ALPHA = 0.60
    final_home = ALPHA * p_home_win + (1 - ALPHA) * xgb_home
    final_draw = ALPHA * p_draw     + (1 - ALPHA) * xgb_draw
    final_away = ALPHA * p_away_win + (1 - ALPHA) * xgb_away

    if knockout:
        # No draws in knockout — redistribute draw probability proportionally to home/away
        total_wo_draw = final_home + final_away
        final_home += final_draw * (final_home / total_wo_draw)
        final_away += final_draw * (final_away / total_wo_draw)
        final_draw = 0.0
    else:
        # Draw boost: Poisson/XGBoost systematically underweight draws in WC football
        DRAW_BOOST = 1.6
        final_draw *= DRAW_BOOST

    total = final_home + final_draw + final_away
    final_home /= total
    final_draw /= total
    final_away /= total

    return {
        'HOME_WIN':  round(final_home, 4),
        'DRAW':      round(final_draw, 4),
        'AWAY_WIN':  round(final_away, 4),
        'home_elo':  round(home_elo),
        'away_elo':  round(away_elo),
        'home_xg':   round(lambda_home, 3),
        'away_xg':   round(lambda_away, 3),
    }
