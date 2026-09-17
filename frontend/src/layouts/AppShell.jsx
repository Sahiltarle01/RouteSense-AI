import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/trips/new", label: "Plan Trip" },
  { to: "/trips", label: "My Trips" },
  { to: "/alerts", label: "Alerts" },
  { to: "/profile", label: "Profile" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div style={styles.shell}>
      {/* Mobile top bar -- sidebar becomes a drawer below this breakpoint */}
      <header style={styles.mobileTopbar} className="rs-mobile-topbar">
        <button
          aria-label="Open navigation menu"
          style={styles.menuBtn}
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>
        <span style={styles.brandNameMobile}>RouteSense AI</span>
      </header>

      {mobileOpen && (
        <div style={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(mobileOpen ? styles.sidebarOpenMobile : {}),
        }}
        className="rs-sidebar"
      >
        <div style={styles.brandRow}>
          <div style={styles.logoMark}>R</div>
          <span style={styles.brandName}>RouteSense AI</span>
          <button
            aria-label="Close navigation menu"
            style={styles.closeBtn}
            className="rs-close-btn"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userSummary}>
            <div style={styles.userAvatar}>{(user?.full_name || "?").charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.userName}>{user?.full_name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main style={styles.content} className="rs-content">
        <Outlet />
      </main>

      <style>{`
        .rs-close-btn { display: none; }
        @media (max-width: 860px) {
          .rs-mobile-topbar { display: flex !important; }
          .rs-sidebar { transform: translateX(-100%); transition: transform 0.2s ease; }
          .rs-close-btn { display: inline-flex !important; }
          .rs-content { margin-left: 0 !important; padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  shell: { display: "flex", minHeight: "100vh", background: "var(--bg-page)" },
  mobileTopbar: {
    display: "none", position: "sticky", top: 0, zIndex: 20,
    alignItems: "center", gap: 12, padding: "12px 16px",
    background: "var(--bg-surface)", borderBottom: "1px solid var(--border-line)",
    width: "100%",
  },
  menuBtn: { background: "transparent", border: "1px solid var(--border-line)", borderRadius: 6, padding: "6px 10px", fontSize: 16 },
  brandNameMobile: { fontWeight: 700, fontSize: 14.5 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 25,
  },
  sidebar: {
    width: 232, background: "var(--bg-elevated)", color: "var(--text-inverse)",
    display: "flex", flexDirection: "column", padding: "18px 14px",
    position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 30,
  },
  sidebarOpenMobile: { transform: "translateX(0)" },
  brandRow: { display: "flex", alignItems: "center", gap: 10, padding: "0 6px", marginBottom: 22 },
  logoMark: { width: 28, height: 28, borderRadius: 6, background: "var(--accent-route)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 },
  brandName: { fontWeight: 700, fontSize: 14.5, flex: 1 },
  closeBtn: { background: "transparent", border: "none", color: "var(--text-inverse)", fontSize: 22, lineHeight: 1, padding: "0 4px" },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navLink: { padding: "10px 12px", borderRadius: 7, color: "#b7c1cf", textDecoration: "none", fontSize: 13.5 },
  navLinkActive: { background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 600 },
  sidebarFooter: { borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 },
  userSummary: { display: "flex", alignItems: "center", gap: 10 },
  userAvatar: { width: 32, height: 32, borderRadius: "50%", background: "var(--accent-route)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userEmail: { fontSize: 11.5, color: "#8b96a6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logoutBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", borderRadius: 7, padding: "8px 0", fontSize: 12.5 },
  content: { flex: 1, marginLeft: 232, padding: "26px 32px", minWidth: 0 },
};
