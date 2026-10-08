"""Read company data from stdin and return an XGBoost prediction."""

import json
import sys
from pathlib import Path

import joblib

from company_features import build_company_text, extract_features


MODEL_PATH = Path(__file__).resolve().parent / "company_model.joblib"


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        bundle = joblib.load(MODEL_PATH)
        feature_values = extract_features(payload.get("company_name"), payload.get("url"))
        company_text = build_company_text(payload)
        vectorized_text = bundle["vectorizer"].transform([company_text])
        model = bundle["model"]
        probability = float(model.predict_proba(vectorized_text)[0][1])
        decision_threshold = float(bundle.get("decision_threshold", 0.5))
        predicted_label = int(probability >= decision_threshold)
        terms = bundle["vectorizer"].get_feature_names_out()
        booster_importance = model.get_booster().get_score(importance_type="gain")
        feature_importance = [
            booster_importance.get(f"f{index}", 0.0)
            for index in range(len(terms))
        ]
        contributions = vectorized_text.multiply(feature_importance).toarray()[0]
        top_indices = [
            index
            for index in contributions.argsort()[::-1]
            if contributions[index] > 0
        ][:5]
        top_features = [
            {
                "feature": str(terms[index]),
                "importance": round(float(contributions[index]), 4),
            }
            for index in top_indices
        ]
        print(json.dumps({
            "fake_probability": round(probability, 8),
            "predicted_label": predicted_label,
            "predicted_class": "suspicious" if predicted_label else "legitimate",
            "decision_threshold": decision_threshold,
            "feature_values": {
                **{
                    name: round(float(value), 4)
                    for name, value in feature_values.items()
                },
                "has_company_evidence": bool(
                    payload.get("category")
                    or payload.get("modus_operandi")
                    or payload.get("red_flags")
                ),
            },
            "top_features": top_features,
            "model": "XGBoost + word/character TF-IDF",
            "source_dataset": bundle["source_dataset"],
            "metrics": bundle["metrics"],
            "evidence": {
                "category": payload.get("category") or None,
                "impersonation_target": payload.get("impersonation_target") or None,
                "modus_operandi": payload.get("modus_operandi") or None,
                "red_flags": payload.get("red_flags") or None,
                "risk_severity": payload.get("risk_severity") or None,
            },
        }))
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()