import React from "react";
import RiskGauge from "./RiskGauge.jsx";

const LEVEL_STYLE = {
  Low: { bg: "var(--success-dim)", color: "var(--success)" },
  Medium: { bg: "var(--warning-dim)", color: "var(--warning)" },
  High: { bg: "rgba(210, 153, 34, 0.15)", color: "#d29922" },
  Critical: { bg: "var(--danger-dim)", color: "var(--danger)" },
};

export default function RiskCard({ profile, riskAssessment }) {
  const level = riskAssessment?.riskLevel || "Low";
  const style = LEVEL_STYLE[level] || LEVEL_STYLE.Low;

  return (
    <div className="panel gauge-card">
      <div className="panel-title">Risk assessment</div>
      <RiskGauge percent={riskAssessment?.riskPercent ?? 0} level={level} color={riskAssessment?.color} />
      <span className="risk-badge" style={{ background: style.bg, color: style.color }}>
        {level} risk
      </span>

      <div className="profile-meta">
        <div className="profile-meta-title">Profile details</div>
        <div className="row">
          <span>Name</span>
          <span>{profile?.fullName || "—"}</span>
        </div>
        <div className="row profile-workplace">
          <span>Workplace</span>
          <span>{profile?.workplace || "—"}</span>
        </div>
        <div className="row">
          <span>Location</span>
          <span>{profile?.location || "—"}</span>
        </div>
        <div className="row">
          <span>Connections</span>
          <span>{profile?.connections ?? "—"}</span>
        </div>
        <div className="row">
          <span>Followers</span>
          <span>{profile?.followers ?? "—"}</span>
        </div>
        <div className="row">
          <span>Profile photo</span>
          <span>{profile?.hasPhoto ? "Yes" : "No"}</span>
        </div>
        {profile?.datasetLabel !== null && profile?.datasetLabel !== undefined && (
          <div className="row">
            <span>Dataset label</span>
            <span>{profile.datasetLabel === 0 ? "Genuine" : "Fake"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
