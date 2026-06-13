import pandas as pd
import numpy as np
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

def predicting(home_team: str, away_team: str, neutral: bool):
    elo_current = pd.read_csv(BASE_DIR / 'data/processed/elo_current.csv')
    home_elo = elo_current[elo_current['team'] == home_team]['elo'].values[0]
    away_elo = elo_current[elo_current['team'] == away_team]['elo'].values[0]
    elo_diff = home_elo - away_elo

    model_result = joblib.load(BASE_DIR / 'models/model.pkl')
    scaler = joblib.load(BASE_DIR / 'models/scaler.pkl')

    features = np.array([[elo_diff, neutral, 60]])
    features_scaled = scaler.transform(features)

    probs = model_result.predict_proba(features_scaled)[0]

    return {
        **dict(zip(model_result.classes_, probs)),
        "home_elo": round(float(home_elo)),
        "away_elo": round(float(away_elo)),
    }
