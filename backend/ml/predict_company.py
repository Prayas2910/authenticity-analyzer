"""Read company_name/url JSON from stdin and return an XGBoost prediction."""

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

from company_features import extract_features


MODEL_PATH = Path(__file__).resolve().parent / "company_model.joblib"


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        bundle = joblib.load(MODEL_PATH)
        feature_values = extract_features(payload.get("company_name"), payload.get("url"))
        X = pd.DataFrame([[feature_values[name] for name in bundle["features"]]], columns=bundle["features"])
        probability = float(bundle["model"].predict_proba(X)[0][1])
        predicted_label = int(probability >= 0.5)
        importances = bundle["feature_importances"]
        top_features = [
            {"feature": name, "importance": round(float(value), 4)}
            for name, value in sorted(importances.items(), key=lambda item: item[1], reverse=True)[:5]
        ]
        print(json.dumps({
            "fake_probability": round(probability, 4),
            "predicted_label": predicted_label,
            "predicted_class": "suspicious" if predicted_label else "legitimate",
            "top_features": top_features,
            "model": "XGBoost",
            "source_dataset": bundle["source_dataset"],
            "metrics": bundle["metrics"],
        }))
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()