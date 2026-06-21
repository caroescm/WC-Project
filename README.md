# World Cup 2026 Forecast Dashboard

A probabilistic forecasting system for the 2026 FIFA World Cup. Predicts match outcomes using an ensemble of Poisson regression and XGBoost, simulates the full 96-match tournament via Monte Carlo, and updates dynamically as real results come in.

Live predictions update after every match — Elo ratings recalculate, rolling form metrics shift, and tournament odds regenerate automatically.

---

## How it works

### 1. Elo rating system (`src/elo.py`)

Every team has a numerical Elo rating reflecting their historical strength. After each match:

```
new_rating = old_rating + K × log(goal_diff + 1) × (actual − expected)
```

- **K-factor** is match-importance weighted: World Cup matches (`K=60`) move ratings more than friendlies (`K=12`)
- **Margin of victory** is log-scaled so a 4-0 win matters more than 1-0, but with diminishing returns
- **Expected score** follows the standard Elo formula: `1 / (1 + 10^((rating_B − rating_A) / 400))`

Alongside Elo, the system maintains **Exponentially Weighted Moving Averages** of each team's attack and defense strength, with two time horizons (span-10 for long-term form, span-5 for recent form). Goals are weighted by opponent Elo — scoring 3 against a top-ranked side counts more than 3 against a weak one.

### 2. Match prediction engine (`src/predict.py`)

Each matchup runs through a **two-model ensemble**:

**Model A — Poisson xG model (60% weight)**
- Predicts expected goals (`λ_home`, `λ_away`) using EWM rolling stats, Elo difference, and head-to-head history
- Builds a 15×15 joint probability matrix of all scorelines
- Applies the **Dixon-Coles correction** (ρ = −0.13) to fix Poisson's known underestimation of low-scoring draws
- Sums the matrix triangles for P(home win), P(draw), P(away win)

**Model B — XGBoost classifier (40% weight)**
- Trained specifically on World Cup match data
- Features: Elo gap, market value differential (log-scaled), FIFA ranking difference, 4-year win rate, World Cup titles, tournament experience
- Captures structural quality signals that match-level Poisson misses

**Neutral ground correction:** Since all World Cup matches are at neutral venues, predictions are averaged symmetrically from both team perspectives (normal + flipped feature sets) to remove any home-field bias in the trained models.

**Draw calibration:** Poisson/XGBoost systematically underweight draws in international football. The system applies a 1.6× draw boost for group stage matches. In knockout rounds, draws are redistributed proportionally to home/away (since extra time eliminates draws as a final result).

### 3. Monte Carlo tournament simulator (`src/montecarlo.py`)

Runs 3,000+ full tournament simulations to produce a probability distribution over stages for each team.

Each simulation:
1. Simulates all 48 group stage matches by sampling outcomes from predicted probabilities, then sampling goals from Poisson(λ)
2. Ranks each group by points → goal difference → goals scored
3. Selects the best 8 third-place teams from 12 groups and assigns them to bracket slots — a constraint satisfaction problem solved with **backtracking search** using most-constrained-first ordering
4. Simulates the knockout bracket (R32 → R16 → QF → SF → Final) with no-draw rules

Output: `{ team: { r32, r16, qf, sf, final, winner } }` as probabilities (0–1).

The simulation cache is invalidated automatically when a real result is posted, so odds update after every match day.

### 4. REST API (`src/api.py`)

Built with **FastAPI**. Exposes predictions and simulation results to the frontend.

| Endpoint | Description |
|----------|-------------|
| `GET /fixtures` | All 104 fixtures with predictions; syncs Elos first |
| `GET /predict` | Win/draw/loss probabilities + xG for any matchup |
| `GET /simulate` | Full tournament odds from Monte Carlo (cached) |
| `POST /result` | Register a real scoreline; updates Elos and regenerates odds |

**Prediction logging:** Before updating Elos after a result, the API captures and saves the pre-match prediction to `predictions_log.csv`. This preserves a clean record for post-tournament model calibration — checking whether 70% predictions won ~70% of the time.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js + TypeScript |
| Charts | Recharts / ECharts |
| Backend | Python + FastAPI |
| ML models | scikit-learn, XGBoost, scipy |
| Data pipeline | pandas |
| Frontend deploy | Vercel |
| Backend deploy | Railway |

---

## Project structure

```
WC-Project/
├── data/
│   ├── raw/
│   │   └── wc2026_fixtures.csv       # All 104 WC fixtures with live results
│   └── processed/
│       ├── elo_base.csv              # Pre-tournament Elo ratings (baseline)
│       ├── elo_current.csv           # Live Elo ratings (updated after each match)
│       ├── elo_history.csv           # Per-match Elo snapshots (98k rows, 1872–2026)
│       ├── matches_clean.csv         # Cleaned international results (49k matches)
│       ├── team_rolling_stats.csv    # EWM attack/defense/form metrics per team
│       ├── team_features_2026.csv    # Static team quality features (market value, rank, etc.)
│       └── predictions_log.csv       # Pre-match predictions logged before each result
├── models/
│   ├── model_home.pkl                # Poisson xG model (home goals)
│   ├── model_away.pkl                # Poisson xG model (away goals)
│   ├── model_xgb_wc.pkl             # XGBoost win/draw/loss classifier
│   ├── scaler.pkl / xgb_scaler.pkl  # Feature scalers
│   └── feature_cols.pkl             # Feature column names
├── notebooks/
│   ├── 04b-GoalsModelV2.py          # Poisson xG model training
│   └── 05-XGBoostWC.py              # XGBoost classifier training
├── scripts/
│   ├── build_team_features.py        # Assembles team_features_2026.csv
│   ├── reset_and_replay.py           # Resets Elo to baseline and replays all results
│   └── upgrade_and_replay.py         # Adds new stat columns and replays history
├── src/
│   ├── config.py                     # K-factors and team name normalization map
│   ├── elo.py                        # Elo update logic and rolling stats
│   ├── predict.py                    # Ensemble prediction engine
│   ├── montecarlo.py                 # Tournament simulator
│   └── api.py                        # FastAPI backend
└── frontend/                         # Next.js dashboard
```

---

## Data sources

- **Historical results** — International football results 1872–2026 ([martj42/international_results](https://github.com/martj42/international_results))
- **WC 2026 fixtures** — Full 96-match schedule with group assignments and bracket structure
- **Team features** — Market values, FIFA rankings, World Cup pedigree compiled per team

---

## Running locally

**Backend**
```bash
pip install -r requirements.txt
uvicorn src.api:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
