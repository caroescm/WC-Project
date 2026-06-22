# World Cup 2026 Forecast Dashboard — Project Roadmap

> **Tournament:** June 11 – July 19, 2026 · **Updated:** June 21, 2026
>
> A probabilistic forecast lab that publishes pre-match win/draw/loss probabilities,
> simulates tournament outcomes via Monte Carlo, and tracks model performance as
> real results come in.

---

## Phase 0 — Data Foundation ✅
*Status: Complete*

| Task | Output | Status |
|------|--------|--------|
| Download historical results dataset (martj42) | `results.csv` | ✅ |
| Clean and normalize match records | `matches_clean.csv` (49,215 matches, 1872–2026) | ✅ |
| Build chronological Elo rating pipeline | `elo_history.csv`, `elo_current.csv` (333 teams) | ✅ |

---

## Phase 1 — Modeling ✅
*Status: Complete — exceeded original scope*

Skipped the planned logistic regression baseline and went straight to a two-model ensemble.

### 1.1 Poisson xG model
- EWM rolling attack/defense stats (span-5 and span-10) weighted by opponent Elo
- 15×15 joint scoreline probability matrix
- **Dixon-Coles correction** (ρ = −0.13) to fix Poisson's underestimation of low-scoring draws
- **Neutral ground correction**: predictions averaged symmetrically from both team perspectives
- **Draw calibration**: 1.6× boost for group stage; redistribution for knockout rounds
- Output: `model_home.pkl`, `model_away.pkl`

### 1.2 XGBoost classifier
- Trained specifically on World Cup match data
- Features: Elo gap, market value differential (log-scaled), FIFA ranking difference, 4-year win rate, World Cup titles, tournament experience
- Output: `model_xgb_wc.pkl`

### 1.3 Ensemble
- 60% Poisson xG / 40% XGBoost weighted blend
- Outputs calibrated P(home win), P(draw), P(away win) + xG per team

### 1.4 Backtesting
- ❌ Not completed — deprioritized in favour of shipping the live dashboard

---

## Phase 2 — Tournament Simulator ✅
*Status: Complete*

### 2.1 Group stage simulator
- 48 teams, 12 groups of 4
- Simulates each group match from predicted probabilities, samples goals from Poisson(λ)
- Full tiebreaker logic: points → goal difference → goals scored

### 2.2 Knockout stage simulator
- Round of 32 → Round of 16 → QF → SF → Final
- No-draw rules (extra time / penalties modelled as coin flip)
- **Backtracking search** with most-constrained-first ordering to assign the 8 best third-place teams to correct bracket slots

### 2.3 Monte Carlo engine
- **3,000 full tournament simulations** per run
- Output per team: `{ r32, r16, qf, sf, final, winner }` as probabilities
- Simulation cache invalidated automatically when a real result is posted

---

## Phase 3 — Backend API ✅
*Status: Complete · Deployed on Railway*

| Endpoint | Description |
|----------|-------------|
| `GET /fixtures` | All fixtures with live predictions; syncs Elos first |
| `GET /predict` | Win/draw/loss + xG for any matchup |
| `GET /simulate` | Full tournament odds from Monte Carlo (cached, 1h TTL) |
| `POST /result` | Register a real scoreline; updates Elos and regenerates odds |

**Prediction logging:** Before updating Elos, the API captures and saves the pre-match prediction to `predictions_log.csv` — preserving a clean record for post-tournament model calibration.

Planned but not built: `/teams`, `/groups`, `/model/performance` endpoints.

---

## Phase 4 — Frontend Dashboard ✅
*Status: Complete · Deployed on Vercel*

### Pages built

| Page | Contents |
|------|----------|
| **Dashboard** | KPI cards (favorite, outperforming, underperforming, accuracy, remaining) · Monte Carlo bar chart · Rolling accuracy line chart · Win type donut · xG vs goals performance · Group predictability |
| **Predictions** | Tournament Odds table (sortable, filterable by stage) · Match Predictions (upcoming fixtures with probability bars, upset alerts) · Bracket (R32 draw + round filter + simulation favorites per round) |
| **Results** | Stat summary (accuracy, vs baseline, avg draw prob) · Paginated results table with predicted vs actual |
| **Teams** | Per-team Elo, form, simulation odds |
| **Groups** | Group standings with simulated qualification probabilities |

### Not built
- Model Performance page (calibration curve, Brier score, log loss visualization)
- Qualification scenarios ("what does Team X need to advance?")
- "What changed after today's matches?" digest
- Explainability panel (top features per prediction)

---

## Phase 5 — Live Tournament ✅ (in progress)
*June 11 – July 19 · Group stage ongoing*

### 5.1 Results ingestion
- Manual: real scorelines registered via `POST /result`
- Elo ratings recalculate after each match
- Simulation cache regenerates automatically
- Knockout bracket slots updated manually in `wc2026_fixtures.csv` as teams advance

### 5.2 Prediction logging
- `predictions_log.csv` captures pre-match predictions before each result is posted
- Data accumulates throughout the tournament for post-tournament calibration

### 5.3 Automation
- ❌ No cron job or GitHub Actions — updates are manual

---

## What's Left

| Item | Priority |
|------|----------|
| Model Performance page (calibration curve) | Medium |
| Bracket slot updates as R32 starts (Jun 28) | High |
| Post-tournament calibration analysis | Low — after Jul 19 |

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js + TypeScript |
| Charts | Recharts / SVG (hand-rolled) |
| Backend | Python + FastAPI |
| ML models | scikit-learn, XGBoost, scipy |
| Data pipeline | pandas |
| Frontend deploy | Vercel |
| Backend deploy | Railway |
