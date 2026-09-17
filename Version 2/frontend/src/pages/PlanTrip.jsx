import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NER_LOCATIONS } from "../data/nerLocations";
import { createTrip } from "../services/trips";

const CARGO_TYPES = [
  { value: "medicine", label: "Medicine" },
  { value: "food", label: "Food" },
  { value: "emergency_supplies", label: "Emergency Supplies" },
  { value: "relief_materials", label: "Relief Materials" },
  { value: "general_essential_goods", label: "General Essential Goods" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function PlanTrip() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tripName: "", origin: "", destination: "", cargoType: CARGO_TYPES[0].value,
    priority: "normal", notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.tripName.trim()) return setError("Trip name is required.");
    if (!form.origin) return setError("Select an origin.");
    if (!form.destination) return setError("Select a destination.");
    if (form.origin === form.destination) return setError("Origin and destination must be different.");

    setLoading(true);
    try {
      const trip = await createTrip({
        trip_name: form.tripName,
        origin: form.origin,
        destination: form.destination,
        cargo_type: form.cargoType,
        priority: form.priority,
        notes: form.notes || null,
      });
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(" ") : detail || "Unable to create trip. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={styles.title}>Plan a Trip</h1>
      <p style={styles.subtitle}>
        Version 2 uses a fixed set of North Eastern India locations for trip records.
        Real road routing and route intelligence arrive in a later version.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Trip Name
          <input
            style={styles.input}
            value={form.tripName}
            onChange={(e) => update("tripName", e.target.value)}
            placeholder="Medicine delivery to Tawang"
          />
        </label>

        <div style={styles.row}>
          <label style={styles.label}>
            Origin
            <select style={styles.input} value={form.origin} onChange={(e) => update("origin", e.target.value)}>
              <option value="">Select origin…</option>
              {NER_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </label>

          <label style={styles.label}>
            Destination
            <select style={styles.input} value={form.destination} onChange={(e) => update("destination", e.target.value)}>
              <option value="">Select destination…</option>
              {NER_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </label>
        </div>

        <div style={styles.row}>
          <label style={styles.label}>
            Cargo Type
            <select style={styles.input} value={form.cargoType} onChange={(e) => update("cargoType", e.target.value)}>
              {CARGO_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <label style={styles.label}>
            Cargo Priority
            <select style={styles.input} value={form.priority} onChange={(e) => update("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        </div>

        <label style={styles.label}>
          Notes (optional)
          <textarea
            style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Cold-chain sensitive, fragile, etc."
          />
        </label>

        {error && <div style={styles.errorBox}>{error}</div>}

        <button style={styles.submit} type="submit" disabled={loading}>
          {loading ? "Saving trip…" : "Save Trip"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  title: { fontSize: 22, margin: "0 0 4px", fontWeight: 600 },
  subtitle: { fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px", maxWidth: 560, lineHeight: 1.5 },
  form: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: 22, maxWidth: 620, display: "flex", flexDirection: "column", gap: 16 },
  row: { display: "flex", gap: 16, flexWrap: "wrap" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 500, flex: 1, minWidth: 180 },
  input: { background: "var(--bg-page)", border: "1px solid var(--border-line)", borderRadius: 7, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, width: "100%", fontFamily: "inherit" },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "9px 12px", borderRadius: 7, fontSize: 13 },
  submit: { background: "var(--accent-route)", color: "#fff", fontWeight: 600, border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14.5 },
};
