import React from "react";

const PRIORITY_LABELS = { normal: "Normal", high: "High", critical: "Critical" };
const PRIORITY_COLORS = { normal: "--status-planned", high: "--severity-high", critical: "--severity-critical" };

export function PriorityBadge({ priority }) {
  const colorVar = PRIORITY_COLORS[priority] || "--text-muted";
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: `var(${colorVar})` }}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}

const SEVERITY_LABELS = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const SEVERITY_COLORS = {
  low: "--severity-low", medium: "--severity-medium", high: "--severity-high", critical: "--severity-critical",
};

export function SeverityBadge({ severity }) {
  const colorVar = SEVERITY_COLORS[severity] || "--text-muted";
  return (
    <span
      style={{
        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        color: `var(${colorVar})`, border: `1px solid var(${colorVar})`,
      }}
    >
      {SEVERITY_LABELS[severity] || severity}
    </span>
  );
}
