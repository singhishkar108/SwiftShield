import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";
import "../styles/home.css";

export default function Home() {
  const { token, username, setToken, setUsername } = useAuth();

  function logout() {
    setToken("");
    setUsername("");
  }

  const isAuthed = Boolean(token);

  return (
    <Layout username={username} isAuthed={isAuthed} onLogout={logout}>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-wrap">
          <h1 className="shimmer-text">International Payments Portal</h1>
          <p className="subtitle">
            Move money globally with bank-grade security, real-time FX, and smart compliance.
          </p>

          {!isAuthed ? (
            <div className="cta">
              <Link className="btn solid xlg shimmer cta-magnet" to="/register">
                Create account
              </Link>
              <Link className="btn ghost xlg" to="/login">
                Sign in
              </Link>
            </div>
          ) : (
            <div className="welcome-card glass fancy-glow">
              <div className="w-head">
                <span className="hi">Welcome back,</span>
                <strong className="user-name">{username}</strong>
              </div>

              <div className="w-actions">
                <Link className="quick" to="/payments">
                  <div>
                    <span className="q-title">New Payment</span>
                    <span className="q-sub">SWIFT / SEPA / RTP</span>
                  </div>
                  <span className="q-arrow">→</span>
                </Link>

                <Link className="quick" to="/beneficiaries">
                  <div>
                    <span className="q-title">Beneficiaries</span>
                    <span className="q-sub">Add & manage payees</span>
                  </div>
                  <span className="q-arrow">→</span>
                </Link>

                <Link className="quick" to="/history">
                  <div>
                    <span className="q-title">Payment History</span>
                    <span className="q-sub">Receipts & tracking</span>
                  </div>
                  <span className="q-arrow">→</span>
                </Link>
              </div>

              <div className="w-secure">
                <span>🔒 Security: HTTPS • reCAPTCHA • CSRF • Rate-limiting</span>
                <button className="logout-link" onClick={logout}>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="features">
        <div className="grid">
          <article className="card glass">
            <div className="feat-icon">💱</div>
            <h3>Real-time FX</h3>
            <p>Transparent conversion rates with instant rate locks before you send.</p>
          </article>

          <article className="card glass">
            <div className="feat-icon">🌐</div>
            <h3>Global Coverage</h3>
            <p>Send to 180+ countries via multi-rail routing (SWIFT, SEPA, ACH).</p>
          </article>

          <article className="card glass">
            <div className="feat-icon">🛡️</div>
            <h3>Compliance First</h3>
            <p>Automated KYC/KYB verification, sanction screening, and live monitoring.</p>
          </article>

          <article className="card glass">
            <div className="feat-icon">📑</div>
            <h3>Receipts & Tracking</h3>
            <p>Download proof of payment, access SWIFT MT103 logs, and track real-time status.</p>
          </article>
        </div>
      </section>
    </Layout>
  );
}