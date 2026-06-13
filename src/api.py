from fastapi import FastAPI
from predict import predicting

app = FastAPI()

@app.get("/predict")
def predict(home_team: str, away_team: str, neutral: bool = False):
    return predicting(home_team, away_team, neutral)