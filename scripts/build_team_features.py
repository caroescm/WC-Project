"""
Build data/processed/team_features_2026.csv with per-team features for WC 2026.

Features produced:
  market_value_log  — log of estimated squad market value (EUR), scaled from 2022 + 4yr growth
  fifa_rank_est     — estimated FIFA rank from ELO using 2022 linear fit
  wins_4y_rate      — win rate in last 4 years (from matches_clean.csv 2022-2026)
  goals_scored_4y   — goals scored per game last 4 years
  goals_received_4y — goals conceded per game last 4 years
  wc_titles         — World Cup titles won (from train.csv, most recent year available)
  wc_participations — number of WC participations before 2026
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

TRAIN_CSV    = ROOT / 'data/raw/wc_train.csv'
MATCHES_CSV  = ROOT / 'data/processed/matches_clean.csv'
ELO_CURR_CSV = ROOT / 'data/processed/elo_current.csv'
OUT_CSV      = ROOT / 'data/processed/team_features_2026.csv'

MARKET_GROWTH = 1.18   # ~4.5% per year × 4 years

train   = pd.read_csv(TRAIN_CSV)
matches = pd.read_csv(MATCHES_CSV, parse_dates=['date'])
elo     = pd.read_csv(ELO_CURR_CSV)

wc_teams = sorted(elo['team'].unique())

# ── 1. WC pedigree from train.csv (use most-recent available year per team) ──
pedigree_cols = ['world_cup_titles_before', 'world_cup_participations_before']
pedigree = (
    train.sort_values('version')
         .groupby('team')[pedigree_cols]
         .last()
         .reset_index()
         .rename(columns={
             'world_cup_titles_before':        'wc_titles',
             'world_cup_participations_before': 'wc_participations',
             'team': 'team_train',
         })
)

# ── 2. FIFA rank estimate: linear fit ELO → FIFA rank on 2022 data ──────────
data22 = train[train['version'] == 2022][['team', 'fifa_rank_pre_tournament']].copy()
elo22_lookup = {}
for _, row in data22.iterrows():
    team = row['team']
    elo_row = elo[elo['team'] == team]
    if not elo_row.empty:
        elo22_lookup[team] = (elo_row['elo'].values[0], row['fifa_rank_pre_tournament'])

elo_vals  = np.array([v[0] for v in elo22_lookup.values()])
rank_vals = np.array([v[1] for v in elo22_lookup.values()])
# Simple linear fit: rank = a * elo + b
coeffs = np.polyfit(elo_vals, rank_vals, 1)
poly   = np.poly1d(coeffs)

def elo_to_rank(elo_val):
    rank = poly(elo_val)
    return max(1.0, float(rank))

# ── 3. Market value: scale 2022 values, fallback via rank→value fit ─────────
mv22 = train[train['version'] == 2022][['team', 'squad_total_market_value_eur']].dropna()
# Fit rank → log(market_value) on 2022 data for teams with both
mv22 = mv22.merge(data22, on='team')
mv22['log_mv'] = np.log(mv22['squad_total_market_value_eur'])
mv_coeffs = np.polyfit(mv22['fifa_rank_pre_tournament'], mv22['log_mv'], 1)
mv_poly   = np.poly1d(mv_coeffs)

mv22_dict = dict(zip(mv22['team'], mv22['squad_total_market_value_eur']))

def estimate_market_value(team, rank_est):
    if team in mv22_dict:
        return mv22_dict[team] * MARKET_GROWTH
    log_mv = mv_poly(rank_est)
    return float(np.exp(log_mv))

# ── 4. 4-year form from matches_clean.csv (2022-2026) ────────────────────────
cutoff = pd.Timestamp('2022-01-01')
recent = matches[matches['date'] >= cutoff].copy()

home_r = recent[['date', 'home_team', 'home_score', 'away_score']].copy()
home_r.columns = ['date', 'team', 'gf', 'ga']
away_r = recent[['date', 'away_team', 'away_score', 'home_score']].copy()
away_r.columns = ['date', 'team', 'gf', 'ga']

all_r = pd.concat([home_r, away_r])
all_r['win']  = (all_r['gf'] > all_r['ga']).astype(int)
all_r['draw'] = (all_r['gf'] == all_r['ga']).astype(int)

form4y = all_r.groupby('team').agg(
    total_games   = ('win', 'count'),
    wins          = ('win', 'sum'),
    goals_scored  = ('gf', 'sum'),
    goals_conceded= ('ga', 'sum'),
).reset_index()
form4y['wins_4y_rate']      = form4y['wins'] / form4y['total_games'].clip(lower=1)
form4y['goals_scored_4y']   = form4y['goals_scored']   / form4y['total_games'].clip(lower=1)
form4y['goals_received_4y'] = form4y['goals_conceded'] / form4y['total_games'].clip(lower=1)

# ── 5. Assemble final features per WC 2026 team ──────────────────────────────
rows = []
for team in wc_teams:
    elo_val  = float(elo.loc[elo['team'] == team, 'elo'].values[0])
    rank_est = elo_to_rank(elo_val)
    mv_est   = estimate_market_value(team, rank_est)

    prow = pedigree[pedigree['team_train'] == team]
    wc_titles = int(prow['wc_titles'].values[0]) if not prow.empty else 0
    wc_parts  = int(prow['wc_participations'].values[0]) if not prow.empty else 0

    frow = form4y[form4y['team'] == team]
    wins_rate   = float(frow['wins_4y_rate'].values[0])   if not frow.empty else 0.40
    goals_scrd  = float(frow['goals_scored_4y'].values[0])   if not frow.empty else 1.20
    goals_recv  = float(frow['goals_received_4y'].values[0]) if not frow.empty else 1.20

    rows.append({
        'team':              team,
        'elo':               elo_val,
        'fifa_rank_est':     rank_est,
        'market_value_log':  np.log(mv_est),
        'wins_4y_rate':      wins_rate,
        'goals_scored_4y':   goals_scrd,
        'goals_received_4y': goals_recv,
        'wc_titles':         wc_titles,
        'wc_participations': wc_parts,
    })

features_df = pd.DataFrame(rows)
features_df.to_csv(OUT_CSV, index=False)
print(f"Saved {len(features_df)} teams to {OUT_CSV}")
print(features_df.sort_values('fifa_rank_est').head(15).to_string(index=False))
