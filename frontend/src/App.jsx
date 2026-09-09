import React, { useEffect, useRef, useState } from "react";
import ControlPanel from "./components/ControlPanel.jsx";
import PipelineDiagram from "./components/PipelineDiagram.jsx";
import RiskCard from "./components/RiskCard.jsx";
import AgentGrid from "./components/AgentGrid.jsx";
import ExplainabilityPanel from "./components/ExplainabilityPanel.jsx";
import CompanyChecker from "./components/CompanyChecker.jsx";
import { analyze, health } from "./api.js";

const STAGE_DELAY = 380; // ms between simulated pipeline stages

export default function App() {
  const [backendUp, setBackendUp] = useState(null);
  const [stage, setStage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [section, setSection] = useState("profile");
  const timerRef = useRef(null);

  useEffect(() => {
    health()
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));
  }, []);

  function stopStageAnimation() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function startStageAnimation() {
    stopStageAnimation();
    setStage(1);
    let s = 1;
    timerRef.current = setInterval(() => {
      s += 1;
      if (s > 5) {
        stopStageAnimation();
        return;
      }
      setStage(s);
    }, STAGE_DELAY);
  }

  async function handleAnalyze(payload) {
    setError(null);
    setResult(null);
    setLoading(true);
    startStageAnimation();
    const minAnimation = new Promise((resolve) => setTimeout(resolve, STAGE_DELAY * 5));

    try {
      const [res] = await Promise.all([analyze(payload), minAnimation]);
      stopStageAnimation();
      setStage(6);
      setResult(res);
    } catch (err) {
      stopStageAnimation();
      setStage(0);
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <img src="/assets/spammedin-logo.png" alt="SpammedIn" />
          </div>
          <div className="brand-name"></div>
          <div className="brand-tag">Trusted, Checked</div>
        </div>
        <div className="status-pill">
          <span className={`status-dot ${backendUp === false ? "off" : ""}`} />
          {backendUp === null ? "Connecting" : backendUp ? "System ready" : "Backend unavailable"}
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow">A clearer way to check online identity</div>
            <h1>Look twice before you trust what you see.</h1>
            <p>
              Veriscan helps you review people and companies using the details that are actually visible, with a result you can understand and act on.
            </p>
            <div className="hero-highlights">
              <span className="hero-chip">Profile signals</span>
              <span className="hero-chip">Company checks</span>
              <span className="hero-chip">Plain-language findings</span>
            </div>
          </div>

          <div className="hero-side-card">
            <div className="card-kicker">Built for a quick second opinion</div>
            <h2>Evidence first.</h2>
            <p>Choose one thing to review, see what stands out, and keep the decision in your hands.</p>
            <ul className="hero-list">
              <li><strong>Search.</strong> Start with a profile or company already in the dataset.</li>
              <li><strong>Review.</strong> See the checks that shaped the result.</li>
              <li><strong>Decide.</strong> Use the evidence as context, not a verdict.</li>
            </ul>
          </div>
        </div>

        <nav className="section-nav" aria-label="Analysis sections">
          <button className={section === "profile" ? "active" : ""} onClick={() => setSection("profile")} type="button">
            <span className="section-nav-icon">P</span>
            <span><strong>Profile review</strong><small>People and authenticity signals</small></span>
          </button>
          <button className={section === "company" ? "active" : ""} onClick={() => setSection("company")} type="button">
            <span className="section-nav-icon">C</span>
            <span><strong>Company check</strong><small>Organizations and risk signals</small></span>
          </button>
        </nav>

        {section === "profile" && (
        <div className="workspace">
          <ControlPanel onAnalyze={handleAnalyze} loading={loading} />

          <div>
            <PipelineDiagram stage={stage} />

            {error && (
              <div className="error-box">
                {error.message}
                {error.hint && <div style={{ marginTop: 6, opacity: 0.85 }}>{error.hint}</div>}
              </div>
            )}

            {!result && !loading && !error && (
              <div className="panel empty-state">
                <div className="glyph">◌</div>
                <p>Choose a profile to review, open a random sample, or enter the details yourself to see a full readiness report here.</p>
              </div>
            )}

            {result && (
              <div className="results-grid">
                <RiskCard profile={result.profile} riskAssessment={result.riskAssessment} />
                <div className="right-col">
                  <AgentGrid agents={result.agents} />
                  <ExplainabilityPanel explainability={result.explainability} />
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {section === "company" && <div className="workspace single-column company-workspace">
          <CompanyChecker />
        </div>}
      </main>
    </div>
  );
}
