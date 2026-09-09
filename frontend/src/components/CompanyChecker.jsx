import React, { useState } from "react";
import { analyzeCompany, checkCompany, searchCompany } from "../api.js";

export default function CompanyChecker() {
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function formatProbability(value) {
    const percent = Number(value || 0) * 100;
    return percent > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`;
  }

  async function runAnalysis(selectedCompany) {
    setError(null);
    setCompany(selectedCompany);
    setPrediction(null);
    setLoading(true);
    try {
      const res = await analyzeCompany({
        name: selectedCompany.companyName,
        url: selectedCompany.url,
      });
      setCompany(res.company || selectedCompany);
      setPrediction(res.prediction || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function lookupByName(e) {
    e.preventDefault();
    setError(null);
    setCompany(null);
    setPrediction(null);
    setResults([]);
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchCompany(query);
      setResults(res.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function lookupByUrl(e) {
    e.preventDefault();
    setError(null);
    setCompany(null);
    setPrediction(null);
    setResults([]);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await checkCompany({ url });
      if (res.company) await runAnalysis(res.company);
    } catch (err) {
      setError(err.message.includes("404")
        ? "That LinkedIn URL is not in organisation_dataset.csv. Try a company returned by name search."
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel company-checker">
      <div className="panel-title">
        <span>Company review</span>
      </div>
      <p className="panel-sub">
        Search the company directory, then review the signals behind its classification.
      </p>

      <form className="company-form" onSubmit={lookupByName}>
        <div className="field">
          <label>Company name</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Acme Corporation"
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search company"}
        </button>
      </form>

      <div className="divider">or</div>

      <form className="company-form" onSubmit={lookupByUrl}>
        <div className="field">
          <label>Company LinkedIn URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/company/12345"
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Checking…" : "Verify URL"}
        </button>
      </form>

      {error && <div className="company-error">{error}</div>}

      {company && (
        <div className="company-result">
          <div className="company-result-head">
            <div className="result-status success">Company found</div>
            {!prediction && (
              <button className="btn-primary company-analyze" type="button" disabled={loading} onClick={() => runAnalysis(company)}>
                {loading ? "Analyzing…" : "Analyze company"}
              </button>
            )}
          </div>
          <div className="result-row">
            <span>Name</span>
            <strong>{company.companyName}</strong>
          </div>
          <div className="result-row">
            <span>LinkedIn URL</span>
            <a href={company.url} target="_blank" rel="noreferrer">{company.url}</a>
          </div>
          <div className="result-row">
            <span>Source</span>
            <span>{company.source}</span>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="company-results-list">
          <div className="result-status info">Matches</div>
          {results.map((item) => (
            <div key={item.url} className="company-row">
              <div className="company-name">{item.companyName}</div>
              <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
              <button className="company-action" type="button" disabled={loading} onClick={() => runAnalysis(item)}>
                {loading ? "Analyzing…" : "Run predictive analysis"}
              </button>
            </div>
          ))}
        </div>
      )}

      {loading && company && !prediction && (
        <div className="company-analysis-loading">Running XGBoost analysis…</div>
      )}

      {prediction && (
        <div className={`company-prediction ${prediction.predicted_label ? "is-risk" : "is-legitimate"}`}>
          <div className="prediction-header">
            <div>
              <div className="result-status info">Predictive analysis</div>
              <h3>{prediction.predicted_class === "suspicious" ? "Suspicious company signal" : "Legitimate company signal"}</h3>
            </div>
            <div className="prediction-score-wrap">
              <span>Suspicion score</span>
              <strong className="prediction-score">{formatProbability(prediction.fake_probability)}</strong>
            </div>
          </div>
          <div className="prediction-meter" aria-label={`Suspicion score ${formatProbability(prediction.fake_probability)}`}>
            <span style={{ width: `${Math.max(prediction.fake_probability * 100, prediction.fake_probability > 0 ? 1 : 0)}%` }} />
          </div>
          <p className="prediction-copy">
            This score estimates how closely the company matches suspicious examples in the training dataset. It is a review signal, not a final verdict.
          </p>
          <div className="prediction-meta">
            <span>Model <strong>{prediction.model}</strong></span>
            <span>Source <strong>{prediction.source_dataset}</strong></span>
            <span>Test AUC <strong>{prediction.metrics.test_auc.toFixed(3)}</strong></span>
          </div>
          <div className="prediction-features">
            <div className="prediction-label">Top model features</div>
            {prediction.top_features.map((item) => (
              <div className="prediction-feature" key={item.feature}>
                <span>{item.feature.replaceAll("_", " ")}</span>
                <strong>{item.importance.toFixed(3)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
