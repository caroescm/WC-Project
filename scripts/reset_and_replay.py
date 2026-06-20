"""
Reset all WC 2026 results and replay them in match-number order.

What this does:
  1. Resets elo_current.csv to the pre-tournament baseline (elo_base.csv)
  2. Clears predictions_log.csv
  3. Clears all Result entries from wc2026_fixtures.csv
  4. Replays each result in order, which now:
       - Logs the pre-match prediction (with ELO/rolling stats as of that moment)
       - Updates ELO for both teams
       - Updates rolling attack/defense stats for both teams
"""

import sys
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

# ── 1. Reset ──────────────────────────────────────────────────────────────────

print("Resetting to pre-tournament baseline...")

shutil.copy(ELO_BASE_PATH, ELO_CURRENT_PATH)

if PRED_LOG_PATH.exists():
    PRED_LOG_PATH.unlink()

fixtures = pd.read_csv(FIXTURES_PATH)
fixtures["Result"] = None
fixtures.to_csv(FIXTURES_PATH, index=False)

print("  ✓ elo_current.csv reset to elo_base.csv")
print("  ✓ predictions_log.csv cleared")
print("  ✓ wc2026_fixtures.csv results cleared")

# ── 2. Collect results to replay ─────────────────────────────────────────────

# These are the WC 2026 results in match-number order
RESULTS = [
    (1,  2, 0),   # Mexico       2-0  South Africa
    (2,  2, 1),   # Korea Rep.   2-1  Czechia
    (3,  1, 1),   # Canada       1-1  Bosnia & Herz.
    (4,  4, 1),   # USA          4-1  Paraguay
    (5,  0, 1),   # Haiti        0-1  Scotland
    (6,  2, 0),   # Australia    2-0  Türkiye
    (7,  1, 1),   # Brazil       1-1  Morocco
    (8,  1, 1),   # Qatar        1-1  Switzerland
    (9,  1, 0),   # Côte d'Ivoire 1-0 Ecuador
    (10, 7, 1),   # Germany      7-1  Curaçao
    (11, 2, 2),   # Netherlands  2-2  Japan
    (12, 5, 1),   # Sweden       5-1  Tunisia
    (13, 1, 1),   # Saudi Arabia 1-1  Uruguay
    (14, 0, 0),   # Spain        0-0  Cabo Verde
    (15, 2, 2),   # IR Iran      2-2  New Zealand
    (16, 1, 1),   # Belgium      1-1  Egypt
    (17, 3, 1),   # France       3-1  Senegal
    (18, 1, 4),   # Iraq         1-4  Norway
    (19, 3, 0),   # Argentina    3-0  Algeria
    (20, 3, 1),   # Austria      3-1  Jordan
    (21, 1, 0),   # Ghana        1-0  Panama
    (22, 4, 2),   # England      4-2  Croatia
    (23, 1, 1),   # Portugal     1-1  Congo DR
    (24, 1, 3),   # Uzbekistan   1-3  Colombia
    (25, 1, 1),   # Czechia      1-1  South Africa
    (26, 4, 1),   # Switzerland  4-1  Bosnia & Herz.
    (27, 6, 0),   # Canada       6-0  Qatar
    (28, 1, 0),   # Mexico       1-0  Korea Republic
    (29, 3, 0),   # Brazil       3-0  Haiti
    (30, 0, 1),   # Scotland     0-1  Morocco
    (31, 0, 1),   # Türkiye      0-1  Paraguay
    (32, 2, 0),   # USA          2-0  Australia
    (35, 5, 1),   # Netherlands  5-1  Sweden
]

# ── 3. Replay ─────────────────────────────────────────────────────────────────

print(f"\nReplaying {len(RESULTS)} results...\n")

all_fixtures = pd.read_csv(FIXTURES_PATH)

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

    result_str = f"{home_score}-{away_score}"
    actual = "HOME" if home_score > away_score else "AWAY" if away_score > home_score else "DRAW"
    print(f"Match {match_number:>3}  {home_raw:<28} {home_score}-{away_score}  {away_raw:<28} [{actual}]  {label}")

    register_result(match_number, home_score, away_score)

# Save prediction log
if pred_rows:
    pd.DataFrame(pred_rows).to_csv(PRED_LOG_PATH, index=False)
    print(f"\n✓ Saved {len(pred_rows)} pre-match predictions to predictions_log.csv")

print("\nDone. ELO, rolling stats, and prediction log are fully up to date.")
