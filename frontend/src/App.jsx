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
            <div className="eyebrow">A practical check for professional identities</div>
            <h1>A little due diligence goes a long way.</h1>
            <p>
              Take a closer look at a profile or company before you reach out. We’ll show you what we found and what may deserve a second look.
            </p>
            <div className="hero-highlights">
              <span className="hero-chip">Profile details</span>
              <span className="hero-chip">Company records</span>
              <span className="hero-chip">Clear findings</span>
            </div>
          </div>

          <div className="hero-side-card">
            <div className="card-kicker">A note on how this works</div>
            <h2>Context, not a verdict.</h2>
            <p>Online details can be incomplete. Treat a result as a starting point for your own checks.</p>
            <ul className="hero-list">
              <li><strong>Look up.</strong> Find a person or company in the available records.</li>
              <li><strong>Read through.</strong> See which details shaped the result.</li>
              <li><strong>Use your judgment.</strong> Verify anything important independently.</li>
            </ul>
          </div>
        </div>

        <nav className="section-nav" aria-label="Analysis sections">
          <button className={section === "profile" ? "active" : ""} aria-pressed={section === "profile"} onClick={() => setSection("profile")} type="button">
            <span className="section-nav-icon">P</span>
            <span><strong>People</strong><small>Review a professional profile</small></span>
          </button>
          <button className={section === "company" ? "active" : ""} aria-pressed={section === "company"} onClick={() => setSection("company")} type="button">
            <span className="section-nav-icon">C</span>
            <span><strong>Companies</strong><small>Check an organization</small></span>
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

        <footer className="app-footer">
          <span>SpammedIn</span>
          <span>Independent checks are always worthwhile.</span>
        </footer>
      </main>
    </div>
  );
}
