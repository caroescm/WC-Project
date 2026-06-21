from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
import pandas as pd
from .predict import predicting
from .config import name_map
from .elo import register_result, sync_elos_from_fixtures

BASE_DIR = Path(__file__).parent.parent
PREDICTIONS_LOG = BASE_DIR / "data/processed/predictions_log.csv"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_predictions_log() -> dict:
    """Returns {match_number: prediction_dict} from the log file."""
    if not PREDICTIONS_LOG.exists():
        return {}
    df = pd.read_csv(PREDICTIONS_LOG)
    return {
        int(row["match_number"]): {
            "HOME_WIN": row["HOME_WIN"],
            "DRAW":     row["DRAW"],
            "AWAY_WIN": row["AWAY_WIN"],
            "home_elo": row["home_elo"],
            "away_elo": row["away_elo"],
            "home_xg":  row["home_xg"],
            "away_xg":  row["away_xg"],
        }
        for _, row in df.iterrows()
    }


def _log_prediction(match_number: int, prediction: dict):
    """Save a pre-match prediction to the log (no-op if already logged)."""
    row = pd.DataFrame([{"match_number": match_number, **prediction}])
    if PREDICTIONS_LOG.exists():
        existing = pd.read_csv(PREDICTIONS_LOG)
        if match_number in existing["match_number"].values:
            return  # already logged, don't overwrite
        pd.concat([existing, row], ignore_index=True).to_csv(PREDICTIONS_LOG, index=False)
    else:
        row.to_csv(PREDICTIONS_LOG, index=False)


@app.get("/debug")
def debug():
    import traceback
    try:
        result = predicting("Mexico", "South Africa", neutral=True)
        return {"status": "ok", "result": result}
    except Exception as e:
        return {"status": "error", "error": str(e), "trace": traceback.format_exc()}


@app.get("/predict")
def predict(home_team: str, away_team: str, neutral: bool = False):
    return predicting(home_team, away_team, neutral)


@app.get("/fixtures")
def get_fixtures():
    sync_elos_from_fixtures()
    fixtures = pd.read_csv(BASE_DIR / "data/raw/wc2026_fixtures.csv")
    predictions_log = _load_predictions_log()

    results = []
    for _, row in fixtures.iterrows():
        home = name_map.get(row["Home Team"], row["Home Team"])
        away = name_map.get(row["Away Team"], row["Away Team"])

        if any(c.isdigit() for c in home) or any(c.isdigit() for c in away):
            continue
        if home == "To be announced" or away == "To be announced":
            continue

        match_number = int(row["Match Number"])
        has_result   = pd.notna(row["Result"]) and str(row["Result"]).strip() != ""

        # Played matches → use the pre-match logged prediction if available
        # Upcoming matches → use the live prediction
        group = row.get("Group", "")
        is_knockout = pd.isna(group) or str(group).strip() == ""

        if has_result and match_number in predictions_log:
            prediction = predictions_log[match_number]
        else:
            try:
                prediction = predicting(home, away, neutral=True, knockout=is_knockout)
            except Exception:
                prediction = None

        results.append({
            "match_number": match_number,
            "date":         row["Date"],
            "location":     row["Location"],
            "home_team":    row["Home Team"],
            "away_team":    row["Away Team"],
            "group":        row.get("Group", ""),
            "result":       row["Result"] if pd.notna(row["Result"]) else None,
            "prediction":   prediction,
        })

    return results


@app.get("/simulate")
def simulate():
    from .montecarlo import get_cached_simulation
    return get_cached_simulation()


class ResultInput(BaseModel):
    match_number: int
    home_score:   int
    away_score:   int


@app.post("/result")
def post_result(body: ResultInput):
    from .montecarlo import invalidate_cache
    try:
        # Capture prediction BEFORE ELO is updated — this is the true pre-match prediction
        fixtures = pd.read_csv(BASE_DIR / "data/raw/wc2026_fixtures.csv")
        mask = fixtures["Match Number"] == body.match_number
        if mask.any():
            row  = fixtures[mask].iloc[0]
            home = name_map.get(row["Home Team"], row["Home Team"])
            away = name_map.get(row["Away Team"], row["Away Team"])
            group = row.get("Group", "")
            is_knockout = pd.isna(group) or str(group).strip() == ""
            try:
                prediction = predicting(home, away, neutral=True, knockout=is_knockout)
                _log_prediction(body.match_number, prediction)
            except Exception:
                pass

        result = register_result(body.match_number, body.home_score, body.away_score)
        invalidate_cache()
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
