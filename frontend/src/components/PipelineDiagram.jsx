import React from "react";

// stage: 0 idle, 1 checks, 2 signals, 3 summary, 4 risk, 5 explanation, 6 done
function nodeState(stageIndexOfThisNode, currentStage) {
  if (currentStage === 0) return "idle";
  if (currentStage > stageIndexOfThisNode + 1) return "done";
  if (currentStage === stageIndexOfThisNode + 1) return "active";
  return "idle";
}

export default function PipelineDiagram({ stage }) {
  const steps = [
    { label: "Review starts", icon: "◆", state: nodeState(0, stage) },
    { label: "Profile checks", icon: "4", state: nodeState(1, stage), checks: true },
    { label: "Signals combined", icon: "⋈", state: nodeState(2, stage) },
    { label: "Risk level", icon: "!", state: nodeState(3, stage) },
    { label: "Explanation", icon: "?", state: nodeState(4, stage) },
  ];

  return (
    <div className="pipeline" aria-label="Profile review progress">
      <div className="pipeline-track">
        {steps.map((step, index) => (
          <div className={`pipe-step ${step.state}`} key={step.label}>
            <div className="pipe-step-head">
              <span className="pipe-step-number">{String(index + 1).padStart(2, "0")}</span>
              <div className={`pipe-dot ${step.state === "active" ? "active pulse" : ""} ${step.state === "done" ? "done" : ""}`}>
                {step.state === "done" ? "✓" : step.icon}
              </div>
            </div>
            <div className="pipe-label">{step.label}</div>
            {step.checks && (
              <div className="pipe-check-list" aria-label="Profile, organization, image and behaviour checks">
                {/* <span>Profile</span>
                <span>Organization</span>
                <span>Image</span>
                <span>Behaviour</span> */}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
