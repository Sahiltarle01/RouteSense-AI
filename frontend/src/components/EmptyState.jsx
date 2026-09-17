import React from "react";
import { Link } from "react-router-dom";

export default function EmptyState({ title, description, actionLabel, actionTo }) {
  return (
    <div style={styles.wrap}>
      <p style={styles.title}>{title}</p>
      {description && <p style={styles.description}>{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} style={styles.action}>{actionLabel}</Link>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    border: "1px dashed var(--border-line)", borderRadius: 10,
    padding: "36px 24px", textAlign: "center",
  },
  title: { fontSize: 14.5, fontWeight: 600, margin: "0 0 6px" },
  description: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" },
  action: {
    display: "inline-block", background: "var(--accent-route)", color: "#fff",
    fontWeight: 600, padding: "9px 18px", borderRadius: 7, fontSize: 13.5,
  },
};
