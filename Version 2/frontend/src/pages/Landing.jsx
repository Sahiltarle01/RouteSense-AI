import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>R</div>
          <span style={styles.brandName}>RouteSense AI</span>
        </div>
        <Link to="/login" style={styles.navLogin}>Login</Link>
      </header>

      <main style={styles.hero}>
        <h1 style={styles.heroTitle}>Plan safer routes through difficult terrain.</h1>
        <p style={styles.heroTagline}>
          RouteSense AI helps you plan safer, more reliable transportation and
          delivery routes through disaster-prone and hard-to-access regions —
          weighing risk and accessibility, not just distance.
        </p>
        <div style={styles.ctaRow}>
          <Link to="/register" style={styles.primaryBtn}>Get Started</Link>
          <Link to="/login" style={styles.secondaryBtn}>Login</Link>
        </div>
      </main>

      <section style={styles.featureGrid}>
        <FeatureCard title="Risk-aware routing" text="Every route option is scored for risk and accessibility, not just picked by shortest distance." />
        <FeatureCard title="Live route comparison" text="See alternatives side by side — distance, ETA, risk, and why one is recommended over another." />
        <FeatureCard title="Built for real conditions" text="Designed around the realities of disaster-prone, low-connectivity regions." />
      </section>

      <footer style={styles.footer}>© {new Date().getFullYear()} RouteSense AI</footer>
    </div>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div style={styles.featureCard}>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureText}>{text}</p>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  nav: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 32px", borderBottom: "1px solid var(--border-line)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 32, height: 32, borderRadius: 8, background: "var(--accent-route)",
    color: "#fff", display: "grid", placeItems: "center", fontWeight: 700,
  },
  brandName: { fontWeight: 700, fontSize: 16 },
  navLogin: { fontSize: 14, fontWeight: 600, color: "var(--text-primary)" },
  hero: {
    padding: "72px 32px 56px", maxWidth: 720, margin: "0 auto", textAlign: "center",
  },
  heroTitle: { fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.15, margin: "0 0 16px" },
  heroTagline: { fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 32px" },
  ctaRow: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  primaryBtn: {
    background: "var(--accent-route)", color: "#fff", fontWeight: 600,
    padding: "12px 24px", borderRadius: 8, fontSize: 15,
  },
  secondaryBtn: {
    background: "transparent", color: "var(--text-primary)", fontWeight: 600,
    padding: "12px 24px", borderRadius: 8, fontSize: 15, border: "1px solid var(--border-line)",
  },
  featureGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20, padding: "0 32px 64px", maxWidth: 1000, margin: "0 auto", width: "100%",
  },
  featureCard: {
    background: "var(--bg-surface)", border: "1px solid var(--border-line)",
    borderRadius: 10, padding: 22,
  },
  featureTitle: { fontSize: 15.5, margin: "0 0 8px" },
  featureText: { fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 },
  footer: {
    textAlign: "center", padding: "20px", fontSize: 12.5, color: "var(--text-muted)",
    borderTop: "1px solid var(--border-line)",
  },
};
