import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 404) {
        setError(detail || "No account found with this email.");
      } else if (status === 401) {
        setError(detail || "Incorrect password.");
      } else if (detail) {
        setError(detail);
      } else {
        setError("Could not sign in. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <Link to="/" style={styles.brandRow}>
          <div style={styles.logoMark}>R</div>
          <span style={styles.brandName}>RouteSense AI</span>
        </Link>
        <h2 style={styles.title}>Welcome back</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={styles.passwordRow}>
              <input
                style={styles.input}
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button type="button" style={styles.showToggle} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label style={styles.rememberRow}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button style={styles.submit} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <p style={styles.footerText}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-page)", padding: 24 },
  panel: { width: "100%", maxWidth: 400, background: "var(--bg-surface)", border: "1px solid var(--border-line)", borderRadius: 12, padding: "32px 28px" },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
  logoMark: { width: 30, height: 30, borderRadius: 7, background: "var(--accent-route)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 },
  brandName: { fontWeight: 700, fontSize: 15, color: "var(--text-primary)" },
  title: { fontSize: 19, margin: "0 0 20px" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 },
  input: { background: "var(--bg-page)", border: "1px solid var(--border-line)", borderRadius: 7, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, width: "100%" },
  passwordRow: { display: "flex", gap: 8 },
  showToggle: { background: "transparent", border: "1px solid var(--border-line)", borderRadius: 7, padding: "0 12px", fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap" },
  rememberRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" },
  errorBox: { background: "#fbeaea", border: "1px solid var(--accent-danger)", color: "#8a2b2b", padding: "9px 12px", borderRadius: 7, fontSize: 13 },
  submit: { marginTop: 4, background: "var(--accent-route)", color: "#fff", fontWeight: 600, border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14.5 },
  footerText: { marginTop: 18, fontSize: 13, color: "var(--text-muted)", textAlign: "center" },
};
