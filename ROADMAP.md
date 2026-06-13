# World Cup Forecast Dashboard — Project Roadmap

> **Tournament start:** June 11, 2026 · **Today:** May 7, 2026 · **~5 weeks to go**
>
> The goal is a probabilistic forecast lab — not a certainty predictor — that
> publishes pre-match win/draw/loss probabilities, simulates tournament outcomes,
> and tracks model performance as real results come in.

---

## Phase 0 — Data Foundation ✅
*Status: Complete*

| Task | Output | Status |
|------|--------|--------|
| Download historical results dataset (martj42) | `results.csv` | ✅ |
| Clean and normalize match records | `matches_clean.csv` (49,215 matches, 1872–2026) | ✅ |
| Build chronological Elo rating pipeline | `elo_history.csv`, `elo_current.csv` (333 teams) | ✅ |

---

## Phase 1 — Modeling
*Target: May 7–18*

### 1.1 Baseline model
- Features: Elo difference, home/neutral flag
- Target: win / draw / loss (3-class multinomial)
- Model: Logistic Regression (multinomial)
- Output: `model_baseline.pkl`, baseline accuracy + log loss

### 1.2 Feature engineering
- Rolling form: last-5-match win rate per team
- Rolling goal difference: average over last 5 matches
- Match importance weight (World Cup, qualifier, friendly)
- Head-to-head record (last 5 meetings)

### 1.3 Full prediction model
- Model: Gradient Boosting (XGBoost or LightGBM)
- Features: Elo diff + all engineered features
- Calibrated probabilities (Platt scaling or isotonic regression)
- Output: `model_v1.pkl`

### 1.4 Score / expected-goals model
- Poisson regression for goals scored per team
- Output: expected goals (xG) for each team, likely score range

### 1.5 Backtesting
- Backtest on past World Cups: 2014, 2018, 2022
- Metrics: accuracy, log loss, Brier score, calibration curve
- Output: `backtest_results.csv`, calibration plots

---

## Phase 2 — Tournament Simulator
*Target: May 18–23*

### 2.1 Group stage simulator
- Draw 2026 WC groups (48 teams, 12 groups of 4)
- Simulate each group match using model probabilities
- Output group standings with tiebreaker rules

### 2.2 Knockout stage simulator
- Simulate Round of 32 → Round of 16 → QF → SF → Final
- Handle draws via extra-time / penalty shootout probability

### 2.3 Monte Carlo engine
- Run 10,000+ tournament simulations
- Output: each team's probability to reach each stage (R32, R16, QF, SF, Final, Win)
- Output: `simulation_results.csv`

---

## Phase 3 — Backend API
*Target: May 23–30*

### 3.1 Setup
- FastAPI project scaffold
- Load model, Elo ratings, simulation results at startup

### 3.2 Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /teams` | All teams with Elo rating and tournament odds |
| `GET /teams/{team}` | Team detail: strength, form, recent results |
| `GET /matches` | All scheduled WC matches |
| `GET /matches/{id}/prediction` | Win/draw/loss probs + expected goals |
| `GET /groups` | Group tables with simulated standings |
| `GET /simulate` | Full tournament simulation (cached) |
| `GET /results` | Actual results vs. predictions so far |
| `GET /model/performance` | Accuracy, log loss, Brier score, calibration |

### 3.3 Deployment
- Deploy to Render, Fly.io, or Railway
- CORS configured for frontend origin

---

## Phase 4 — Frontend Dashboard
*Target: May 30 – June 7*

### 4.1 Setup
- Next.js + TypeScript scaffold
- Recharts (or ECharts) for visualizations
- Deploy to Vercel

### 4.2 Pages

#### Match Predictions
- Upcoming WC matches with win / draw / loss probability bars
- Expected goals for each team
- Head-to-head Elo history chart

#### Team Pages
- Elo rating over time (line chart)
- Recent form (last 10 matches)
- Tournament simulation odds (bar chart: odds to reach each stage)

#### Group Table Simulator
- Simulated group standings with probability ranges
- Toggle between "most likely" and "distribution view"

#### Tournament Bracket
- Knockout tree with win probabilities at each node
- Color-coded by confidence

#### Results Tracker *(goes live June 11)*
- Actual vs. predicted result for each match played
- Visual indicator: correct / incorrect / well-calibrated

#### Model Performance
- Running accuracy, log loss, Brier score
- Calibration curve: predicted probability vs. actual frequency
- "Biggest upset so far" callout

### 4.3 Nice-to-haves (post-launch)
- Qualification scenarios ("what does Team X need to advance?")
- "What changed after today's matches?" digest
- Explainability panel: top features influencing a prediction
- Most improved team rating

---

## Phase 5 — Live Tournament (June 11 – July 19)
*Target: Automated updates*

### 5.1 Results ingestion
- Script to fetch actual match results (manual CSV update or live API)
- Recalculate Elo ratings after each match
- Re-run tournament simulations nightly

### 5.2 Model performance tracking
- Log each prediction before kickoff
- Score each prediction after full-time
- Update leaderboard of model metrics in real time

### 5.3 Automation
- Cron job (or GitHub Actions) to update data and re-deploy after each match day
- Alert if model performance degrades significantly

---

## Milestone Summary

| # | Milestone | Target Date |
|---|-----------|-------------|
| M0 | Data cleaned, Elo pipeline running | ✅ May 7 |
| M1 | Baseline model trained and backtested | May 18 |
| M2 | Tournament simulator producing odds | May 23 |
| M3 | Backend API live (Render/Fly.io) | May 30 |
| M4 | Frontend dashboard deployed (Vercel) | June 7 |
| M5 | **World Cup kicks off** | June 11 |
| M6 | Live results + model tracking active | June 14 |
| M7 | Final, post-tournament analysis | July 20 |

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js + TypeScript |
| Charts | Recharts or ECharts |
| Backend | Python + FastAPI |
| Modeling | pandas, scikit-learn, XGBoost |
| Data | CSV → DuckDB (later) |
| Frontend deploy | Vercel |
| Backend deploy | Render / Fly.io / Railway |

---

## Current Files

```
WC-Project/
├── results.csv          # raw historical results (source)
├── goalscorers.csv      # raw goalscorer data (future use)
├── shootouts.csv        # raw shootout data (future use)
├── former_names.csv     # team name history (for normalization)
├── matches_clean.csv    # ✅ cleaned match records
├── elo_history.csv      # ✅ per-match Elo snapshots (98k rows)
├── elo_current.csv      # ✅ current Elo for 333 teams
├── clean_matches.py     # ✅ cleaning script
├── build_elo.py         # ✅ Elo pipeline script
└── ROADMAP.md           # this file
```

---

*Next step: Phase 1.1 — train the baseline logistic regression model using Elo difference as the sole feature.*
