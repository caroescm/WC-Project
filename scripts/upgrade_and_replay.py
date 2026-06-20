"""
Full model upgrade + replay pipeline.

Steps:
  1. Save current WC 2026 results
  2. Reset ELO, rolling stats, predictions log, and fixture results
  3. Retrain enhanced Poisson model (04b-GoalsModelV2.py)
  4. Build 2026 team features (build_team_features.py)
  5. Train XGBoost WC ensemble (05-XGBoostWC.py)
  6. Replay all saved results (logs pre-match predictions with new model)
"""

import sys
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
from src.config import name_map
from src.elo import register_result
# predict is imported after training so models exist

FIXTURES_PATH    = ROOT / 'data/raw/wc2026_fixtures.csv'
ELO_BASE_PATH    = ROOT / 'data/processed/elo_base.csv'
ELO_CURRENT_PATH = ROOT / 'data/processed/elo_current.csv'
PRED_LOG_PATH    = ROOT / 'data/processed/predictions_log.csv'
ROLLING_PATH     = ROOT / 'data/processed/team_rolling_stats.csv'

# ── 1. Save existing results ──────────────────────────────────────────────────
print("Step 1: Reading results to replay...")

# Canonical results list kept in sync with reset_and_replay.py
RESULTS = [
    (1,  2, 0),  (2,  2, 1),  (3,  1, 1),  (4,  4, 1),
    (5,  0, 1),  (6,  2, 0),  (7,  1, 1),  (8,  1, 1),
    (9,  1, 0),  (10, 7, 1),  (11, 2, 2),  (12, 5, 1),
    (13, 1, 1),  (14, 0, 0),  (15, 2, 2),  (16, 1, 1),
    (17, 3, 1),  (18, 1, 4),  (19, 3, 0),  (20, 3, 1),
    (21, 1, 0),  (22, 4, 2),  (23, 1, 1),  (24, 1, 3),
    (25, 1, 1),  (26, 4, 1),  (27, 6, 0),  (28, 1, 0),
    (29, 3, 0),  (30, 0, 1),  (31, 0, 1),  (32, 2, 0),
    (35, 5, 1),
]
replay_list = RESULTS
fixtures = pd.read_csv(FIXTURES_PATH)
print(f"  {len(replay_list)} results to replay.")

# ── 2. Reset ──────────────────────────────────────────────────────────────────
print("\nStep 2: Resetting to pre-tournament baseline...")
shutil.copy(ELO_BASE_PATH, ELO_CURRENT_PATH)

if PRED_LOG_PATH.exists():
    PRED_LOG_PATH.unlink()

fixtures['Result'] = None
fixtures.to_csv(FIXTURES_PATH, index=False)

# Strip WC 2026 rows from rolling stats (keep only pre-tournament history)
rolling = pd.read_csv(ROLLING_PATH)
rolling['date'] = pd.to_datetime(rolling['date'], errors='coerce')
rolling_pre = rolling[rolling['date'] < pd.Timestamp('2026-06-11')]
rolling_pre.to_csv(ROLLING_PATH, index=False)

print("  ✓ elo_current.csv reset")
print("  ✓ predictions_log.csv cleared")
print("  ✓ wc2026_fixtures.csv results cleared")
print(f"  ✓ team_rolling_stats.csv trimmed to {len(rolling_pre)} rows (pre-tournament)")

# ── 3. Retrain Poisson model ───────────────────────────────────────────────────
print("\nStep 3: Retraining enhanced Poisson model...")
result = subprocess.run(
    [sys.executable, str(ROOT / 'notebooks/04b-GoalsModelV2.py')],
    capture_output=True, text=True,
)
print(result.stdout)
if result.returncode != 0:
    print("ERROR:", result.stderr)
    sys.exit(1)

# ── 4. Build 2026 team features ───────────────────────────────────────────────
print("\nStep 4: Building 2026 team features...")
result = subprocess.run(
    [sys.executable, str(ROOT / 'scripts/build_team_features.py')],
    capture_output=True, text=True,
)
print(result.stdout)
if result.returncode != 0:
    print("ERROR:", result.stderr)
    sys.exit(1)

# ── 5. Train XGBoost WC model ─────────────────────────────────────────────────
print("\nStep 5: Training XGBoost WC ensemble model...")
result = subprocess.run(
    [sys.executable, str(ROOT / 'notebooks/05-XGBoostWC.py')],
    capture_output=True, text=True,
)
print(result.stdout)
if result.returncode != 0:
    print("ERROR:", result.stderr)
    sys.exit(1)

# ── 6. Replay results with new model ──────────────────────────────────────────
print(f"\nStep 6: Replaying {len(replay_list)} results with upgraded model...\n")

# Now that all models exist, import predict
from src.predict import predicting as predicting_new, reload_data as reload_new

reload_new()

all_fixtures = pd.read_csv(FIXTURES_PATH)
pred_rows = []

for match_number, home_score, away_score in replay_list:
    row = all_fixtures[all_fixtures['Match Number'] == match_number].iloc[0]
    home_raw = row['Home Team']
    away_raw = row['Away Team']
    home = name_map.get(home_raw, home_raw)
    away = name_map.get(away_raw, away_raw)

    try:
        reload_new()
        pred = predicting_new(home, away, neutral=True)
        pred_rows.append({'match_number': match_number, **pred})
        label = f"  HW={pred['HOME_WIN']*100:.0f}% D={pred['DRAW']*100:.0f}% AW={pred['AWAY_WIN']*100:.0f}%"
    except Exception as e:
        label = f"  prediction failed: {e}"

    actual = 'HOME' if home_score > away_score else ('AWAY' if away_score > home_score else 'DRAW')
    print(f"Match {match_number:>3}  {home_raw:<28} {home_score}-{away_score}  {away_raw:<28} [{actual}]  {label}")

    register_result(match_number, home_score, away_score)

if pred_rows:
    pd.DataFrame(pred_rows).to_csv(PRED_LOG_PATH, index=False)
    print(f"\n✓ Saved {len(pred_rows)} pre-match predictions to predictions_log.csv")

# ── Accuracy report ───────────────────────────────────────────────────────────
print("\n── Accuracy report ──────────────────────────────────────────────────")
if not PRED_LOG_PATH.exists():
    print("No predictions log found — skipping accuracy report.")
    sys.exit(0)
log = pd.read_csv(PRED_LOG_PATH)
fixture_results = pd.read_csv(FIXTURES_PATH)

def actual_outcome(row):
    r = str(row.get('Result', '')).replace(' ', '')
    if not r or r == 'nan':
        return None
    parts = r.split('-')
    h, a = int(parts[0]), int(parts[1])
    return 'HOME' if h > a else ('AWAY' if a > h else 'DRAW')

correct = 0
total = 0
for _, pred_row in log.iterrows():
    mn = int(pred_row['match_number'])
    fix_row = fixture_results[fixture_results['Match Number'] == mn]
    if fix_row.empty:
        continue
    actual = actual_outcome(fix_row.iloc[0])
    if actual is None:
        continue
    pred_outcome = max(['HOME_WIN', 'DRAW', 'AWAY_WIN'], key=lambda k: pred_row[k])
    pred_map = {'HOME_WIN': 'HOME', 'DRAW': 'DRAW', 'AWAY_WIN': 'AWAY'}
    if pred_map[pred_outcome] == actual:
        correct += 1
    total += 1

if total > 0:
    print(f"Accuracy: {correct}/{total} = {correct/total*100:.1f}%")

print("\nDone. ELO, rolling stats, team features, models, and prediction log are up to date.")
