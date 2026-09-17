import React, { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../services/profile";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setFullName(p.full_name);
        setPhoneNumber(p.phone_number);
      })
      .catch(() => setError("Unable to load profile."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const payload = { full_name: fullName, phone_number: phoneNumber };
    if (newPassword) {
      if (!currentPassword) return setError("Enter your current password to set a new one.");
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }

    setSaving(true);
    try {
      const updated = await updateProfile(payload);
      setProfile(updated);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Profile updated.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(" ") : detail || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: "var(--text-muted)" }}>Loading…</div>;
  if (error && !profile) return <div style={styles.errorBox}>{error}</div>;

  return (
    <div>
      <h1 style={styles.title}>Profile</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Full Name
          <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>

        <label style={styles.label}>
          Email
          <input style={{ ...styles.input, ...styles.readOnly }} value={profile.email} readOnly />
          <span style={styles.hint}>Email cannot be changed yet — a verified change workflow isn't built in this version.</span>
        </label>

        <label style={styles.label}>
          Phone
          <input style={styles.input} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        </label>

        <label style={styles.label}>
          Account Created
          <input style={{ ...styles.input, ...styles.readOnly }} value={new Date(profile.created_at).toLocaleDateString()} readOnly />
        </label>

        <div style={styles.divider} />

        <p style={styles.sectionLabel}>Change Password (optional)</p>
        <label style={styles.label}>
          Current Password
          <input style={styles.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>
        <label style={styles.label}>
          New Password
          <input style={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters, 1 letter, 1 number" />
        </label>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <button style={styles.submit} type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  title: { fontSize: 22, margin: "0 0 20px", fontWeight: 600 },
  form: { background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 10, padding: 22, maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 },
  input: { background: "var(--bg-page)", border: "1px solid var(--border-line)", borderRadius: 7, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, width: "100%" },
  readOnly: { color: "var(--text-muted)", cursor: "not-allowed" },
  hint: { fontSize: 11.5, color: "var(--text-muted)", fontWeight: 400 },
  divider: { borderTop: "1px solid var(--border-line)", margin: "6px 0" },
  sectionLabel: { fontSize: 13, fontWeight: 600, margin: 0 },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "9px 12px", borderRadius: 7, fontSize: 13 },
  successBox: { background: "#e8f5ef", border: "1px solid var(--accent-route)", color: "var(--accent-route-dark)", padding: "9px 12px", borderRadius: 7, fontSize: 13 },
  submit: { background: "var(--accent-route)", color: "#fff", fontWeight: 600, border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14.5 },
};
