import React from "react";

const LEVEL_COLOR = {
  Low: "var(--green)",
  Medium: "var(--amber)",
  High: "#f2883a",
  Critical: "var(--red)",
};

export default function RiskGauge({ percent, level, color }) {
  const score = Number.isFinite(Number(percent))
    ? Math.min(100, Math.max(0, Number(percent)))
    : 0;
  const radius = 78;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const c = color || LEVEL_COLOR[level] || "var(--cyan)";

  return (
    <div
      className="gauge-wrap"
      role="progressbar"
      aria-label="Risk score"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={score}
    >
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="gauge-score">
        <div className="num" style={{ color: c }}>
          {score}%
        </div>
        <div className="pct">risk score</div>
      </div>
      <div className="gauge-range" aria-hidden="true">
        <span>0 · lower risk</span>
        <span>100 · higher risk</span>
      </div>
    </div>
  );
}
