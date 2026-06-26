"""
Reset all WC 2026 results and replay them in match-number order.

What this does:
  1. Reads all completed results from wc2026_fixtures.csv
  2. Resets elo_current.csv to the pre-tournament baseline (elo_base.csv)
  3. Clears predictions_log.csv
  4. Replays each result in order, which:
       - Logs the pre-match prediction (with ELO/rolling stats as of that moment)
       - Updates ELO for both teams
       - Updates rolling attack/defense stats for both teams
"""

import sys
import re
import shutil
from pathlib import Path

# Allow running from project root or scripts/
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
from src.config import name_map
from src.elo import register_result
from src.predict import predicting, reload_data

FIXTURES_PATH    = ROOT / "data/raw/wc2026_fixtures.csv"
ELO_BASE_PATH    = ROOT / "data/processed/elo_base.csv"
ELO_CURRENT_PATH = ROOT / "data/processed/elo_current.csv"
PRED_LOG_PATH    = ROOT / "data/processed/predictions_log.csv"

# ── 1. Read completed results from fixtures ───────────────────────────────────

all_fixtures = pd.read_csv(FIXTURES_PATH)

def parse_result(result_str):
    """Parse '2 - 1' or '0 -3 ' into (2, 1). Returns None if not a valid score."""
    if pd.isna(result_str):
        return None
    m = re.match(r'\s*(\d+)\s*-\s*(\d+)\s*', str(result_str))
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))

played = all_fixtures[all_fixtures["Result"].notna()].copy()
played["_parsed"] = played["Result"].apply(parse_result)
played = played[played["_parsed"].notna()].sort_values("Match Number")

RESULTS = [
    (int(row["Match Number"]), *row["_parsed"])
    for _, row in played.iterrows()
]

print(f"Found {len(RESULTS)} completed results in fixtures CSV.")

# ── 2. Reset ──────────────────────────────────────────────────────────────────

print("Resetting to pre-tournament baseline...")

shutil.copy(ELO_BASE_PATH, ELO_CURRENT_PATH)

if PRED_LOG_PATH.exists():
    PRED_LOG_PATH.unlink()

print("  ✓ elo_current.csv reset to elo_base.csv")
print("  ✓ predictions_log.csv cleared")

# ── 3. Replay ─────────────────────────────────────────────────────────────────

print(f"\nReplaying {len(RESULTS)} results...\n")

pred_rows = []

for match_number, home_score, away_score in RESULTS:
    row = all_fixtures[all_fixtures["Match Number"] == match_number].iloc[0]
    home_raw = row["Home Team"]
    away_raw = row["Away Team"]
    home = name_map.get(home_raw, home_raw)
    away = name_map.get(away_raw, away_raw)

    # Reload ELO + rolling stats from disk so prediction uses current state
    reload_data()

    try:
        pred = predicting(home, away, neutral=True)
        pred_rows.append({"match_number": match_number, **pred})
        label = f"  HW={pred['HOME_WIN']*100:.0f}% D={pred['DRAW']*100:.0f}% AW={pred['AWAY_WIN']*100:.0f}%"
    except Exception as e:
        label = f"  prediction failed: {e}"

    actual = "HOME" if home_score > away_score else "AWAY" if away_score > home_score else "DRAW"
    print(f"Match {match_number:>3}  {home_raw:<28} {home_score}-{away_score}  {away_raw:<28} [{actual}]  {label}")

    register_result(match_number, home_score, away_score)

# Save prediction log
if pred_rows:
    pd.DataFrame(pred_rows).to_csv(PRED_LOG_PATH, index=False)
    print(f"\n✓ Saved {len(pred_rows)} pre-match predictions to predictions_log.csv")

print("\nDone. ELO, rolling stats, and prediction log are fully up to date.")
