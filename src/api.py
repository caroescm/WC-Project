from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
import pandas as pd
from .predict import predicting
from .config import name_map
from .elo import register_result, sync_elos_from_fixtures

BASE_DIR = Path(__file__).parent.parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    results = []
    for _, row in fixtures.iterrows():
        home = name_map.get(row["Home Team"], row["Home Team"])
        away = name_map.get(row["Away Team"], row["Away Team"])

        # Skip placeholder teams (knockouts not yet determined)
        if any(c.isdigit() for c in home) or any(c.isdigit() for c in away):
            continue
        if home == "To be announced" or away == "To be announced":
            continue

        try:
            prediction = predicting(home, away, neutral=True)
        except Exception:
            prediction = None

        results.append({
            "match_number": row["Match Number"],
            "date": row["Date"],
            "location": row["Location"],
            "home_team": row["Home Team"],
            "away_team": row["Away Team"],
            "group": row.get("Group", ""),
            "result": row["Result"] if pd.notna(row["Result"]) else None,
            "prediction": prediction,
        })

    return results


@app.get("/simulate")
def simulate():
    from .montecarlo import get_cached_simulation
    return get_cached_simulation()


class ResultInput(BaseModel):
    match_number: int
    home_score: int
    away_score: int


@app.post("/result")
def post_result(body: ResultInput):
    try:
        return register_result(body.match_number, body.home_score, body.away_score)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
