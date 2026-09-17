import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
    if (!form.phoneNumber.trim()) errors.phoneNumber = "Phone number is required";
    else if (form.phoneNumber.replace(/\D/g, "").length < 7) errors.phoneNumber = "Enter a valid phone number";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) errors.password = "Password must contain a letter and a number";
    if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // FastAPI/Pydantic validation error array
        setApiError(detail.map((d) => d.msg).join(" "));
      } else {
        setApiError(detail || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Registration successful">
        <div style={styles.successBox}>
          Registration successful. Please login.
        </div>
        <p style={styles.helperText}>Redirecting you to the login page…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={handleSubmit} style={styles.form} noValidate>
        <Field label="Full Name" error={fieldErrors.fullName}>
          <input style={styles.input} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Jane Doe" />
        </Field>

        <Field label="Email" error={fieldErrors.email}>
          <input style={styles.input} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@example.com" />
        </Field>

        <Field label="Phone Number" error={fieldErrors.phoneNumber}>
          <input style={styles.input} value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="+91 98765 43210" />
        </Field>

        <Field label="Password" error={fieldErrors.password}>
          <div style={styles.passwordRow}>
            <input
              style={styles.input}
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 8 characters, 1 letter, 1 number"
            />
            <button type="button" style={styles.showToggle} onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        <Field label="Confirm Password" error={fieldErrors.confirmPassword}>
          <input
            style={styles.input}
            type={showPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
          />
        </Field>

        {apiError && <div style={styles.errorBox}>{apiError}</div>}

        <button style={styles.submit} type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p style={styles.footerText}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </AuthLayout>
  );
}

function AuthLayout({ title, children }) {
  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <Link to="/" style={styles.brandRow}>
          <div style={styles.logoMark}>R</div>
          <span style={styles.brandName}>RouteSense AI</span>
        </Link>
        <h2 style={styles.title}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={styles.label}>
      {label}
      {children}
      {error && <span style={styles.fieldError}>{error}</span>}
    </label>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-page)", padding: 24 },
  panel: { width: "100%", maxWidth: 440, background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 12, padding: "32px 28px" },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
  logoMark: { width: 30, height: 30, borderRadius: 7, background: "var(--accent-route)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 },
  brandName: { fontWeight: 700, fontSize: 15, color: "var(--text-primary)" },
  title: { fontSize: 19, margin: "0 0 20px" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 },
  input: { background: "var(--bg-page)", border: "1px solid var(--border-line)", borderRadius: 7, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, width: "100%" },
  passwordRow: { display: "flex", gap: 8 },
  showToggle: { background: "transparent", border: "1px solid var(--border-line)", borderRadius: 7, padding: "0 12px", fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap" },
  fieldError: { color: "var(--accent-danger)", fontSize: 12 },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "9px 12px", borderRadius: 7, fontSize: 13 },
  successBox: { background: "#e8f5ef", border: "1px solid var(--accent-route)", color: "var(--accent-route-dark)", padding: "12px 14px", borderRadius: 7, fontSize: 14, fontWeight: 500 },
  helperText: { color: "var(--text-muted)", fontSize: 13, marginTop: 12 },
  submit: { marginTop: 4, background: "var(--accent-route)", color: "#fff", fontWeight: 600, border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14.5 },
  footerText: { marginTop: 18, fontSize: 13, color: "var(--text-muted)", textAlign: "center" },
};
