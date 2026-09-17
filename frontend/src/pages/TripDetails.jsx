import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTrip, updateTripStatus } from "../services/trips";
import StatusBadge from "../components/StatusBadge";
import { PriorityBadge } from "../components/Badges";

const CARGO_LABELS = {
  medicine: "Medicine",
  food: "Food",
  emergency_supplies: "Emergency Supplies",
  relief_materials: "Relief Materials",
  general_essential_goods: "General Essential Goods",
  other: "Other",
};

// Mirrors the backend's ALLOWED_STATUS_TRANSITIONS -- the backend is the
// real enforcement point (it validates independently), this just avoids
// showing a button for a transition that would be rejected anyway.
const NEXT_STATUS_OPTIONS = {
  planned: [{ value: "active", label: "Mark as Active" }, { value: "cancelled", label: "Cancel Trip" }],
  active: [{ value: "completed", label: "Mark as Completed" }, { value: "cancelled", label: "Cancel Trip" }],
  completed: [],
  cancelled: [],
};

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  function load() {
    getTrip(id)
      .then(setTrip)
      .catch((err) => {
        if (err.response?.status === 404) setError("Trip not found.");
        else setError("Unable to load trip details.");
      });
  }

  useEffect(load, [id]);

  async function handleStatusChange(newStatus) {
    setUpdating(true);
    setError("");
    try {
      const updated = await updateTripStatus(id, newStatus);
      setTrip(updated);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update status.");
    } finally {
      setUpdating(false);
    }
  }

  if (error) {
    return (
      <div>
        <div style={styles.errorBox}>{error}</div>
        <button style={styles.backLink} onClick={() => navigate("/trips")}>← Back to My Trips</button>
      </div>
    );
  }

  if (!trip) return <div style={{ color: "var(--text-muted)" }}>Loading…</div>;

  const nextOptions = NEXT_STATUS_OPTIONS[trip.status] || [];

  return (
    <div>
      <button style={styles.backLink} onClick={() => navigate("/trips")}>← Back to My Trips</button>

      <div style={styles.headerRow}>
        <h1 style={styles.title}>{trip.trip_name}</h1>
        <StatusBadge status={trip.status} />
      </div>

      <div className="rs-two-col">
        <div style={styles.mainPanel}>
          <h2 style={styles.sectionTitle}>Journey Summary</h2>
          <p style={styles.schematicNote}>
            Schematic summary only — not a routed map. Real GIS road routing
            arrives in a future version.
          </p>
          <div style={styles.journey}>
            <div style={styles.journeyPoint}>{trip.origin}</div>
            <div style={styles.journeyArrow}>↓</div>
            <div style={styles.journeyPoint}>{trip.destination}</div>
          </div>

          <div style={styles.detailGrid}>
            <Detail label="Cargo Type" value={CARGO_LABELS[trip.cargo_type] || trip.cargo_type} />
            <Detail label="Priority" value={<PriorityBadge priority={trip.priority} />} />
            <Detail label="Created" value={new Date(trip.created_at).toLocaleString()} />
            <Detail label="Last Updated" value={new Date(trip.updated_at).toLocaleString()} />
          </div>

          {trip.notes && (
            <div style={{ marginTop: 16 }}>
              <div style={styles.detailLabel}>Notes</div>
              <p style={styles.notes}>{trip.notes}</p>
            </div>
          )}
        </div>

        <div style={styles.sidePanel}>
          <h2 style={styles.sectionTitle}>Status</h2>
          {nextOptions.length === 0 ? (
            <p style={styles.noActions}>This trip is {trip.status} — no further status changes are possible.</p>
          ) : (
            <div style={styles.statusActions}>
              {nextOptions.map((opt) => (
                <button
                  key={opt.value}
                  style={opt.value === "cancelled" ? styles.dangerBtn : styles.primaryBtn}
                  disabled={updating}
                  onClick={() => handleStatusChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {error && <div style={{ ...styles.errorBox, marginTop: 12 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

const styles = {
  backLink: { background: "none", border: "none", color: "var(--accent-route)", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 16, cursor: "pointer" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  title: { fontSize: 22, margin: 0, fontWeight: 600 },
  mainPanel: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: 22 },
  sidePanel: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: 22, alignSelf: "start" },
  sectionTitle: { fontSize: 14.5, fontWeight: 600, margin: "0 0 6px" },
  schematicNote: { fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", fontStyle: "italic" },
  journey: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, marginBottom: 24, paddingLeft: 4 },
  journeyPoint: { fontSize: 16, fontWeight: 600 },
  journeyArrow: { fontSize: 16, color: "var(--text-muted)", paddingLeft: 4 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 },
  detailLabel: { fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { fontSize: 13.5, fontWeight: 500 },
  notes: { fontSize: 13.5, color: "var(--text-primary)", background: "var(--bg-page)", borderRadius: 7, padding: "10px 12px", margin: 0 },
  statusActions: { display: "flex", flexDirection: "column", gap: 10 },
  primaryBtn: { background: "var(--accent-route)", color: "#fff", fontWeight: 600, border: "none", borderRadius: 7, padding: "10px 0", fontSize: 13.5 },
  dangerBtn: { background: "transparent", color: "var(--accent-danger)", fontWeight: 600, border: "1px solid var(--accent-danger)", borderRadius: 7, padding: "10px 0", fontSize: 13.5 },
  noActions: { fontSize: 13, color: "var(--text-muted)" },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "10px 14px", borderRadius: 7, fontSize: 13 },
};
