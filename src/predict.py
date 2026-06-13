import pandas as pd
import numpy as np
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

def predicting (home_team:str, away_team:str, neutral:bool):
    elo_current = pd.read_csv(BASE_DIR / 'data/processed/elo_current.csv')
    home_elo = elo_current[elo_current['team'] == home_team]['elo'].values[0]
    away_elo = elo_current[elo_current['team'] == away_team]['elo'].values[0]

    elo_diff = home_elo - away_elo

    model_result = joblib.load(BASE_DIR / 'models/model.pkl')
    scaler = joblib.load(BASE_DIR / 'models/scaler.pkl')

    model_home = joblib.load(BASE_DIR / 'models/model_home.pkl')
    model_away = joblib.load(BASE_DIR / 'models/model_away.pkl')

    features = np.array([[elo_diff, neutral, 60]])
    features_scaled = scaler.transform(features)

    expected_home = model_home.predict(features)[0]
    expected_away = model_away.predict(features)[0]

    probs = model_result.predict_proba(features_scaled)[0]
    return {
        **dict(zip(model_result.classes_, probs)),
        "expected_home_goals": round(expected_home, 2),
        "expected_away_goals": round(expected_away, 2)
    }