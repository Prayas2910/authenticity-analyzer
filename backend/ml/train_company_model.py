"""Train the company authenticity XGBoost model from the labelled dataset."""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    precision_recall_curve,
    roc_auc_score,
)
from xgboost import XGBClassifier

from company_features import TEXT_FIELDS, build_company_text


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "backend" / "data" / "organisation_dataset.csv"
MODEL_OUT = Path(__file__).resolve().parent / "company_model.joblib"


def main():
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig").fillna("")
    required_columns = [*TEXT_FIELDS, "label", "split"]
    missing_columns = [column for column in required_columns if column not in df]
    if missing_columns:
        raise SystemExit(f"Missing columns in {DATA_PATH.name}: {', '.join(missing_columns)}")

    X = df.apply(build_company_text, axis=1)
    y = pd.to_numeric(df["label"], errors="raise").astype(int).to_numpy()
    train_mask = df["split"].eq("train").to_numpy()
    val_mask = df["split"].eq("val").to_numpy()
    test_mask = df["split"].eq("test").to_numpy()

    if not train_mask.any() or not val_mask.any() or not test_mask.any():
        raise SystemExit("Dataset must include train, validation, and test rows")

    positive_count = int(y[train_mask].sum())
    if positive_count == 0:
        raise SystemExit("The training split contains no positive company examples")

    vectorizer = FeatureUnion([
        (
            "word",
            TfidfVectorizer(
                lowercase=True,
                ngram_range=(1, 2),
                min_df=1,
                max_features=25000,
                sublinear_tf=True,
            ),
        ),
        (
            "char",
            TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(2, 5),
                min_df=2,
                max_features=15000,
                sublinear_tf=True,
            ),
        ),
    ])
    train_text = vectorizer.fit_transform(X[train_mask])
    val_text = vectorizer.transform(X[val_mask])
    test_text = vectorizer.transform(X[test_mask])
    model = XGBClassifier(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        min_child_weight=1,
        subsample=0.9,
        colsample_bytree=0.8,
        reg_lambda=3,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
        n_jobs=4,
    )
    model.fit(train_text, y[train_mask])

    validation_probability = model.predict_proba(val_text)[:, 1]
    test_probability = model.predict_proba(test_text)[:, 1]
    validation_precision, validation_recall, thresholds = precision_recall_curve(
        y[val_mask],
        validation_probability,
    )
    validation_f1 = (
        2 * validation_precision * validation_recall
        / (validation_precision + validation_recall + 1e-12)
    )
    best_threshold_index = int(
        np.flatnonzero(validation_f1[:-1] == np.max(validation_f1[:-1]))[0]
    )
    decision_threshold = float(thresholds[best_threshold_index])
    test_prediction = (test_probability >= decision_threshold).astype(int)
    metrics = {
        "test_accuracy": float(accuracy_score(y[test_mask], test_prediction)),
        "test_auc": float(roc_auc_score(y[test_mask], test_probability)),
        "test_average_precision": float(average_precision_score(y[test_mask], test_probability)),
        "test_report": classification_report(y[test_mask], test_prediction, output_dict=True),
        "decision_threshold": decision_threshold,
        "validation_f1_at_threshold": float(validation_f1[best_threshold_index]),
        "validation_precision_at_threshold": float(validation_precision[best_threshold_index]),
        "validation_recall_at_threshold": float(validation_recall[best_threshold_index]),
        "train_rows": int(train_mask.sum()),
        "validation_rows": int(val_mask.sum()),
        "test_rows": int(test_mask.sum()),
        "positive_training_rows": positive_count,
        "validation_positive_rows": int(y[val_mask].sum()),
        "test_positive_rows": int(y[test_mask].sum()),
        "validation_probability_range": [
            float(np.min(validation_probability)),
            float(np.max(validation_probability)),
        ],
        "test_probability_range": [
            float(np.min(test_probability)),
            float(np.max(test_probability)),
        ],
    }
    terms = vectorizer.get_feature_names_out()
    feature_importance = model.feature_importances_
    top_features = [
        {"feature": str(terms[index]), "importance": round(float(feature_importance[index]), 4)}
        for index in np.argsort(feature_importance)[::-1][:10]
        if feature_importance[index] > 0
    ]
    joblib.dump(
        {
            "model": model,
            "vectorizer": vectorizer,
            "text_fields": TEXT_FIELDS,
            "metrics": metrics,
            "decision_threshold": decision_threshold,
            "top_features": top_features,
            "source_dataset": DATA_PATH.name,
        },
        MODEL_OUT,
    )

    print(json.dumps({
        "model": str(MODEL_OUT),
        "vocabulary_size": len(terms),
        "validation_auc": float(roc_auc_score(y[val_mask], validation_probability)),
        "model_type": "XGBoost",
        **metrics,
    }, indent=2))


if __name__ == "__main__":
    main()