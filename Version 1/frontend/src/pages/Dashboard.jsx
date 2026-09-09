import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>R</div>
          <span style={styles.brandName}>RouteSense AI</span>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
      </header>

      <main style={styles.content}>
        <h2 style={{ marginTop: 0 }}>Welcome, {user?.full_name}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5, maxWidth: 560 }}>
          You're signed in as <strong>{user?.email}</strong>. This confirms
          registration, login, JWT storage, and protected routing all work
          end-to-end.
        </p>
        <div style={styles.pendingBox}>
          Trip statistics, quick actions, recent trips, and alerts are built
          in Phase 2, once the trip/route data models exist. Nothing here is
          faked in the meantime.
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 28px", borderBottom: "1px solid var(--border-line)", background: "var(--bg-surface)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { width: 28, height: 28, borderRadius: 6, background: "var(--accent-route)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 },
  brandName: { fontWeight: 700, fontSize: 14.5 },
  logoutBtn: { background: "transparent", border: "1px solid var(--border-line)", color: "var(--text-primary)", borderRadius: 7, padding: "7px 14px", fontSize: 13 },
  content: { padding: 28, maxWidth: 720 },
  pendingBox: {
    marginTop: 20, border: "1px dashed var(--border-line)", borderRadius: 8,
    padding: 18, color: "var(--text-muted)", fontSize: 13.5,
  },
};
