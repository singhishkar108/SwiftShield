import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJSON } from "../lib/api";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";
import "../pages/auth.css";
import "../pages/dashboard.css";

export default function PaymentsList() {
  const navigate = useNavigate();
  const { token, username, setToken, setUsername } = useAuth();
  const isAuthed = Boolean(token);

  const logout = () => {
    setToken("");
    setUsername("");
  };

  // Redirect unauthenticated users
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!token) return;

    (async () => {
      try {
        setBusy(true);
        const res = await getJSON("/payments", token);
        if (!mounted) return;
        setPayments(res.payments || []);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load payments");
      } finally {
        if (mounted) setBusy(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <Layout username={username} isAuthed={isAuthed} onLogout={logout}>
      <section className="auth-hero ready">
        {/* Animated Orbs & Background */}
        <div className="auth-bg" aria-hidden="true">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
          <div className="particles">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} style={{ "--i": i }} />
            ))}
          </div>
        </div>

        <div className="dash-wrap">
          <div className="dash-header fade-up s1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h1 className="shimmer-text">Your Payments</h1>
            <Link to="/payments" className="btn solid cta-magnet">
              + New Payment
            </Link>
          </div>

          {/* Error Display */}
          {error && (
            <div className="f-error fade-up s2" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Loading Skeletons */}
          {busy && (
            <div className="fade-up s2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card glass glow" style={{ marginBottom: 14, padding: 18 }}>
                  <div className="skeleton" style={{ width: "40%", height: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: "70%", height: 12, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: "60%", height: 12 }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!busy && payments.length === 0 && (
            <div className="card glass fade-up s2" style={{ padding: "2.5rem", textAlign: "center" }}>
              <p className="muted" style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>
                No payment history found.
              </p>
              <Link to="/payments" className="btn solid">
                Create Your First Payment
              </Link>
            </div>
          )}

          {/* Payment Cards Grid */}
          {!busy && payments.length > 0 && (
            <div className="fade-up s3" style={{ display: "grid", gap: 16 }}>
              {payments.map((p) => (
                <div key={p.id} className="card glass glow hover-lift" style={{ padding: 18 }}>
                  <div className="p-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div className="p-amount">
                      <strong className="mono" style={{ fontSize: "1.2rem", color: "var(--text, #fff)" }}>
                        {p.amount} {p.currency}
                      </strong>
                      <span className="muted" style={{ marginLeft: 8, fontSize: "0.85rem" }}>
                        {p.provider}
                      </span>
                    </div>
                    <span
                      className={`status ${
                        p.status === "approved" || p.status === "completed"
                          ? "ok"
                          : p.status === "pending"
                          ? "warn"
                          : "err"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="p-body" style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
                    <div className="muted">
                      Beneficiary:{" "}
                      <strong style={{ color: "var(--text, #fff)" }}>{p.beneficiaryName}</strong>{" "}
                      <span className="mono">({p.beneficiaryAccount})</span>
                    </div>
                    <div className="muted">
                      SWIFT/BIC: <span className="mono">{p.beneficiarySwift}</span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                      Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="f-secure muted" style={{ marginTop: 24, textAlign: "center" }}>
            Secured by AES-256 • Rate-limited • TLS 1.3
          </div>
        </div>
      </section>
    </Layout>
  );
}