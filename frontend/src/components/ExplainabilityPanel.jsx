import React, { useState } from "react";

export default function ExplainabilityPanel({ explainability }) {
  const items = explainability?.topReasons || [];
  const [copyStatus, setCopyStatus] = useState("");

  async function copyFindings() {
    const lines = [
      "Profile review findings",
      explainability?.summary || "No significant risk signals detected.",
      ...items.map((item) =>
        `- ${item.label} (+${(item.contribution * 100).toFixed(1)} pts): ${item.detail}`
      ),
      "",
      "This report is a review signal, not a final verdict.",
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("Findings copied");
    } catch {
      setCopyStatus("Could not copy findings. Check clipboard permissions and try again.");
    }
  }

  return (
    <div className="panel">
      <div className="explain-heading">
        <div className="panel-title">Why this score</div>
        <button className="copy-findings" type="button" onClick={copyFindings}>
          Copy findings
        </button>
      </div>
      <p className="panel-sub">{explainability?.summary}</p>
      {copyStatus && <div className="copy-status" role="status">{copyStatus}</div>}

      {items.length === 0 ? (
        <div className="hint-box">No significant risk signals detected across any agent.</div>
      ) : (
        <div className="explain-list">
          {items.map((item, i) => (
            <div key={i} className="explain-item">
              <div className="top-row">
                <span className="label">{item.label}</span>
                <span className="contribution">+{(item.contribution * 100).toFixed(1)} pts</span>
              </div>
              <div className="detail">{item.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
