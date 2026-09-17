import React from "react";

const LABELS = { planned: "Planned", active: "Active", completed: "Completed", cancelled: "Cancelled" };
const COLOR_VARS = {
  planned: "--status-planned",
  active: "--status-active",
  completed: "--status-completed",
  cancelled: "--status-cancelled",
};

export default function StatusBadge({ status }) {
  const colorVar = COLOR_VARS[status] || "--text-muted";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: `var(${colorVar})`,
        border: `1px solid var(${colorVar})`,
        background: "transparent",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: `var(${colorVar})` }} />
      {LABELS[status] || status}
    </span>
  );
}
