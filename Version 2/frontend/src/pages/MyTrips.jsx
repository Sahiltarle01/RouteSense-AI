import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteTrip, listMyTrips, updateTripStatus } from "../services/trips";
import StatusBadge from "../components/StatusBadge";
import { PriorityBadge } from "../components/Badges";
import EmptyState from "../components/EmptyState";

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    listMyTrips()
      .then(setTrips)
      .catch(() => setError("Unable to load trips. Please try again."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCancel(trip) {
    if (!window.confirm(`Cancel "${trip.trip_name}"? This cannot be undone.`)) return;
    setBusyId(trip.id);
    try {
      await updateTripStatus(trip.id, "cancelled");
      load();
    } catch {
      setError("Unable to cancel trip.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(trip) {
    if (!window.confirm(`Delete "${trip.trip_name}" permanently?`)) return;
    setBusyId(trip.id);
    try {
      await deleteTrip(trip.id);
      load();
    } catch {
      setError("Unable to delete trip.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>My Trips</h1>
        <Link to="/trips/new" style={styles.newBtn}>+ Plan Trip</Link>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}
      {loading && <div style={styles.loadingText}>Loading trips…</div>}

      {!loading && trips.length === 0 && !error && (
        <EmptyState
          title="No trips yet."
          description="Start planning your first essential delivery journey."
          actionLabel="Plan a Trip"
          actionTo="/trips/new"
        />
      )}

      {trips.length > 0 && (
        <div style={styles.table}>
          {trips.map((trip) => (
            <div key={trip.id} style={styles.row}>
              <Link to={`/trips/${trip.id}`} style={styles.rowMain}>
                <div style={styles.tripName}>{trip.trip_name}</div>
                <div style={styles.tripRoute}>{trip.origin} → {trip.destination}</div>
              </Link>
              <div style={styles.rowMeta}>
                <PriorityBadge priority={trip.priority} />
                <StatusBadge status={trip.status} />
                <span style={styles.dateText}>{new Date(trip.created_at).toLocaleDateString()}</span>
              </div>
              <div style={styles.rowActions}>
                <Link to={`/trips/${trip.id}`} style={styles.actionLink}>View</Link>
                {trip.status === "planned" && (
                  <button
                    style={styles.actionBtn}
                    disabled={busyId === trip.id}
                    onClick={() => handleCancel(trip)}
                  >
                    Cancel
                  </button>
                )}
                {(trip.status === "planned" || trip.status === "cancelled") && (
                  <button
                    style={styles.actionBtnDanger}
                    disabled={busyId === trip.id}
                    onClick={() => handleDelete(trip)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, margin: 0, fontWeight: 600 },
  newBtn: { background: "var(--accent-route)", color: "#fff", fontWeight: 600, padding: "9px 16px", borderRadius: 7, fontSize: 13.5 },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 16 },
  loadingText: { color: "var(--text-muted)", fontSize: 13.5 },
  table: { display: "flex", flexDirection: "column", gap: 8 },
  row: {
    background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10,
    padding: "14px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
  },
  rowMain: { textDecoration: "none", color: "inherit", flex: "1 1 220px", minWidth: 0 },
  tripName: { fontSize: 14, fontWeight: 600 },
  tripRoute: { fontSize: 12.5, color: "var(--text-muted)" },
  rowMeta: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  dateText: { fontSize: 12, color: "var(--text-muted)" },
  rowActions: { display: "flex", gap: 8, flexShrink: 0 },
  actionLink: { fontSize: 12.5, fontWeight: 600, color: "var(--accent-route)", border: "1px solid var(--border-line)", borderRadius: 6, padding: "6px 10px" },
  actionBtn: { fontSize: 12.5, fontWeight: 600, background: "transparent", border: "1px solid var(--border-line)", borderRadius: 6, padding: "6px 10px", color: "var(--text-primary)" },
  actionBtnDanger: { fontSize: 12.5, fontWeight: 600, background: "transparent", border: "1px solid var(--accent-danger)", borderRadius: 6, padding: "6px 10px", color: "var(--accent-danger)" },
};
