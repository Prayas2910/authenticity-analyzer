"""Train the company authenticity XGBoost model from organisation_dataset.csv."""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from xgboost import XGBClassifier

from company_features import FEATURES, extract_features


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "organisation_dataset.csv"
MODEL_OUT = Path(__file__).resolve().parent / "company_model.joblib"


def build_features(df):
    values = [extract_features(row.company_name, row.url) for row in df.itertuples()]
    return pd.DataFrame(values, columns=FEATURES)


def main():
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")
    if "label" not in df or "split" not in df:
        raise SystemExit("organisation_dataset.csv must contain label and split columns")

    X = build_features(df)
    y = df["label"].astype(int)
    train_mask = df["split"].eq("train")
    val_mask = df["split"].eq("val")
    test_mask = df["split"].eq("test")

    positive_count = int(y[train_mask].sum())
    negative_count = int(train_mask.sum() - positive_count)
    if positive_count == 0:
        raise SystemExit("The training split contains no positive company examples")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="binary:logistic",
        eval_metric="logloss",
        scale_pos_weight=negative_count / positive_count,
        random_state=42,
        n_jobs=2,
    )
    model.fit(
        X[train_mask],
        y[train_mask],
        eval_set=[(X[val_mask], y[val_mask])],
        verbose=False,
    )

    test_probability = model.predict_proba(X[test_mask])[:, 1]
    test_prediction = (test_probability >= 0.5).astype(int)
    metrics = {
        "test_accuracy": float(accuracy_score(y[test_mask], test_prediction)),
        "test_auc": float(roc_auc_score(y[test_mask], test_probability)),
        "test_report": classification_report(y[test_mask], test_prediction, output_dict=True),
        "train_rows": int(train_mask.sum()),
        "validation_rows": int(val_mask.sum()),
        "test_rows": int(test_mask.sum()),
        "positive_training_rows": positive_count,
    }
    feature_importances = dict(zip(FEATURES, model.feature_importances_.tolist()))
    joblib.dump(
        {
            "model": model,
            "features": FEATURES,
            "metrics": metrics,
            "feature_importances": feature_importances,
            "source_dataset": str(DATA_PATH.name),
        },
        MODEL_OUT,
    )

    print(json.dumps({"model": str(MODEL_OUT), **metrics}, indent=2))


if __name__ == "__main__":
    main()