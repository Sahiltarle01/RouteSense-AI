import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../services/dashboard";
import { listAlerts } from "../services/alerts";
import StatusBadge from "../components/StatusBadge";
import { PriorityBadge, SeverityBadge } from "../components/Badges";
import EmptyState from "../components/EmptyState";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardSummary(), listAlerts()])
      .then(([summaryData, alertsData]) => {
        setSummary(summaryData);
        setAlerts(alertsData.slice(0, 3));
      })
      .catch(() => setError("Unable to load dashboard. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={styles.title}>Welcome back, {user?.full_name}</h1>
      <p style={styles.subtitle}>Plan and monitor safer journeys for essential deliveries.</p>

      {error && <div style={styles.errorBox}>{error}</div>}
      {loading && <div style={styles.loadingText}>Loading dashboard…</div>}

      {summary && (
        <>
          <div style={styles.statGrid}>
            <StatCard label="Total Trips" value={summary.total_trips} />
            <StatCard label="Planned" value={summary.planned_trips} />
            <StatCard label="Active" value={summary.active_trips} />
            <StatCard label="Completed" value={summary.completed_trips} />
          </div>

          <div style={styles.quickActions}>
            <Link to="/trips/new" style={styles.actionPrimary}>Plan New Trip</Link>
            <Link to="/trips" style={styles.actionSecondary}>View My Trips</Link>
            <Link to="/alerts" style={styles.actionSecondary}>View Alerts</Link>
            <Link to="/profile" style={styles.actionSecondary}>Update Profile</Link>
          </div>

          <div className="rs-two-col">
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Recent Trips</h2>
                <Link to="/trips" style={styles.viewAll}>View all →</Link>
              </div>

              {summary.recent_trips.length === 0 ? (
                <EmptyState
                  title="No trips planned yet."
                  actionLabel="Plan Your First Trip"
                  actionTo="/trips/new"
                />
              ) : (
                <div style={styles.tripList}>
                  {summary.recent_trips.map((t) => (
                    <Link key={t.id} to={`/trips/${t.id}`} style={styles.tripRow}>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.tripName}>{t.trip_name}</div>
                        <div style={styles.tripRoute}>{t.origin} → {t.destination}</div>
                      </div>
                      <div style={styles.tripMeta}>
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Alerts</h2>
                <Link to="/alerts" style={styles.viewAll}>View all →</Link>
              </div>

              {alerts.length === 0 ? (
                <EmptyState title="You're all clear." description="No alerts are currently available." />
              ) : (
                <div style={styles.alertList}>
                  {alerts.map((a) => (
                    <div key={a.id} style={styles.alertRow}>
                      <SeverityBadge severity={a.severity} />
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.alertTitle}>{a.title}</div>
                        <div style={styles.alertLocation}>{a.location}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles = {
  title: { fontSize: 22, margin: "0 0 4px", fontWeight: 600 },
  subtitle: { fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 24px" },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 16 },
  loadingText: { color: "var(--text-muted)", fontSize: 13.5 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 },
  statCard: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: "16px" },
  statLabel: { fontSize: 12, color: "var(--text-muted)", marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: 700 },
  quickActions: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  actionPrimary: { background: "var(--accent-route)", color: "#fff", fontWeight: 600, padding: "9px 16px", borderRadius: 7, fontSize: 13.5 },
  actionSecondary: { background: "var(--bg-surface)", color: "var(--text-primary)", fontWeight: 600, padding: "9px 16px", borderRadius: 7, fontSize: 13.5, border: "1px solid var(--border-line)" },
  panel: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: 18 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  panelTitle: { fontSize: 14.5, margin: 0, fontWeight: 600 },
  viewAll: { fontSize: 12.5, color: "var(--accent-route)", fontWeight: 600 },
  tripList: { display: "flex", flexDirection: "column", gap: 2 },
  tripRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 6px", borderRadius: 7, textDecoration: "none", color: "inherit" },
  tripName: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  tripRoute: { fontSize: 12, color: "var(--text-muted)" },
  tripMeta: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  alertList: { display: "flex", flexDirection: "column", gap: 12 },
  alertRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  alertTitle: { fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
  alertLocation: { fontSize: 11.5, color: "var(--text-muted)" },
};
