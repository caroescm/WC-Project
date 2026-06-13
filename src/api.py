from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import pandas as pd
from predict import predicting
from config import name_map

BASE_DIR = Path(__file__).parent.parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/predict")
def predict(home_team: str, away_team: str, neutral: bool = False):
    return predicting(home_team, away_team, neutral)


@app.get("/fixtures")
def get_fixtures():
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
