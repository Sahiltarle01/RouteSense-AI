import React, { useEffect, useState } from "react";
import { listAlerts, markAlertRead } from "../services/alerts";
import { SeverityBadge } from "../components/Badges";
import EmptyState from "../components/EmptyState";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    listAlerts()
      .then(setAlerts)
      .catch(() => setError("Unable to load alerts."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleMarkRead(id) {
    try {
      await markAlertRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    } catch {
      // Non-critical -- leave the alert as-is if this fails.
    }
  }

  return (
    <div>
      <h1 style={styles.title}>Alerts</h1>
      <p style={styles.subtitle}>
        Version 2 alerts are simulated demo data — not a live weather or incident feed.
      </p>

      {error && <div style={styles.errorBox}>{error}</div>}
      {loading && <div style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Loading alerts…</div>}

      {!loading && alerts.length === 0 && !error && (
        <EmptyState title="You're all clear." description="No alerts are currently available." />
      )}

      <div style={styles.list}>
        {alerts.map((a) => (
          <div key={a.id} style={{ ...styles.card, opacity: a.is_read ? 0.65 : 1 }}>
            <div style={styles.cardHeader}>
              <SeverityBadge severity={a.severity} />
              {a.is_demo && <span style={styles.demoTag}>DEMO</span>}
            </div>
            <div style={styles.cardTitle}>{a.title}</div>
            <p style={styles.cardDescription}>{a.description}</p>
            <div style={styles.cardFooter}>
              <span style={styles.cardMeta}>{a.location} · {new Date(a.created_at).toLocaleDateString()}</span>
              {!a.is_read && (
                <button style={styles.readBtn} onClick={() => handleMarkRead(a.id)}>Mark as read</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: 22, margin: "0 0 4px", fontWeight: 600 },
  subtitle: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 22px" },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 16 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  demoTag: { fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", border: "1px solid var(--border-line)", borderRadius: 4, padding: "2px 6px", letterSpacing: 0.5 },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 6 },
  cardDescription: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 10px" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardMeta: { fontSize: 11.5, color: "var(--text-muted)" },
  readBtn: { fontSize: 12, fontWeight: 600, background: "transparent", border: "1px solid var(--border-line)", borderRadius: 6, padding: "5px 10px" },
};
