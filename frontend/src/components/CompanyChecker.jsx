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

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function formatProbability(value) {
    const percent = toNumber(value) * 100;
    return percent > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`;
  }

  function formatImportance(value) {
    const percent = toNumber(value) * 100;
    return `${percent.toFixed(1)}%`;
  }

  async function runAnalysis(selectedCompany) {
    setError(null);
    setCompany(selectedCompany);
    setPrediction(null);
    setLoading(true);
    try {
      // Send companyName explicitly to avoid re-lookup issues
      const res = await analyzeCompany({
        companyName: selectedCompany.companyName,
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
        ? "We couldn’t find that LinkedIn page in the available records. Try searching by company name instead."
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel company-checker">
      <div className="panel-title">
        <span>Check a company</span>
      </div>
      <p className="panel-sub">
        Search by name or paste a LinkedIn page. We’ll show you which details stood out.
      </p>

      <form className="company-form" onSubmit={lookupByName}>
        <div className="field">
          <label>Company name</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Acme"
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search by name"}
        </button>
      </form>

      <div className="divider">or</div>

      <form className="company-form" onSubmit={lookupByUrl}>
        <div className="field">
          <label>Company LinkedIn page</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/company/example"
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check this page"}
        </button>
      </form>

      {error && <div className="company-error">{error}</div>}

      {company && (
        <div className="company-result">
          <div className="company-result-head">
            <div className="result-status success">Found in directory</div>
            {!prediction && (
              <button className="btn-primary company-analyze" type="button" disabled={loading} onClick={() => runAnalysis(company)}>
                {loading ? "Reviewing…" : "Review company"}
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
          <div className="result-status info">Search results</div>
          {results.map((item) => (
            <div key={item.url} className="company-row">
              <div className="company-name">{item.companyName}</div>
              <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
              <button className="company-action" type="button" disabled={loading} onClick={() => runAnalysis(item)}>
                {loading ? "Reviewing…" : "Review this company"}
              </button>
            </div>
          ))}
        </div>
      )}

      {loading && company && !prediction && (
        <div className="company-analysis-loading">Reviewing the company details…</div>
      )}

      {prediction && (
        <div className={`company-prediction ${prediction.predicted_label ? "is-risk" : "is-legitimate"}`}>
          <div className="prediction-header">
            <div>
              <div className="result-status info">Company check</div>
              <h3>{prediction.predicted_class === "suspicious" ? "Worth a closer look" : "No strong warning signs found"}</h3>
            </div>
            <div className="prediction-score-wrap">
              <span>Suspicion estimate</span>
              <strong className="prediction-score">{formatProbability(prediction.fake_probability)}</strong>
            </div>
          </div>
          <div className="prediction-meter" aria-label={`Suspicion score ${formatProbability(prediction.fake_probability)}`}>
            <span style={{ width: `${Math.max(toNumber(prediction.fake_probability) * 100, toNumber(prediction.fake_probability) > 0 ? 1 : 0)}%` }} />
          </div>
          <p className="prediction-copy">
            This estimate reflects patterns in the available records. It isn’t proof of wrongdoing—check important details independently.
          </p>
          <div className="prediction-meta">
            <span>Review based on the company name and LinkedIn page</span>
          </div>
          <div className="prediction-features">
            <div className="prediction-label">Details used in the review</div>
            {Object.entries(prediction.feature_values || {}).map(([feature, value]) => (
              <div className="prediction-feature" key={feature}>
                <span>{feature.replaceAll("_", " ")}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="prediction-features">
            <div className="prediction-label">What stood out</div>
            {Array.isArray(prediction.top_features) && prediction.top_features.length > 0 ? (
              prediction.top_features.map((item, index) => (
                <div className="prediction-feature" key={`${item.feature || item.name || item.label || "feature"}-${index}`}>
                  <span>{(item.feature || item.name || item.label || "unknown").replaceAll("_", " ")}</span>
                  <strong>{formatImportance(item.importance)}</strong>
                </div>
              ))
            ) : (
              <div className="prediction-feature">
                <span>No feature importance data available</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
