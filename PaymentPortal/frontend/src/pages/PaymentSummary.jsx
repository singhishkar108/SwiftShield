import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getJSON, postJSON } from "../lib/api";
import Layout from "../components/Layout";
import "../pages/auth.css";
import "./pay-summary.css";

export default function PaymentSummary() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, username, setToken, setUsername } = useAuth();

  const [summary, setSummary] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [emailing, setEmailing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch summary if location.state is missing (e.g. direct access or page refresh)
  useEffect(() => {
    if (summary) return;

    let mounted = true;
    async function loadSummary() {
      try {
        setLoading(true);
        const res = await getJSON(`/payments/${id}/summary`, token);
        if (!mounted) return;
        setSummary(res.summary || res);
      } catch (e) {
        if (!mounted) return;
        setMessage({ type: "error", text: e.message || "Failed to load payment details." });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (token && id) {
      loadSummary();
    }
    return () => {
      mounted = false;
    };
  }, [id, token, summary]);

  async function emailPop() {
    const to = prompt("Enter email address to send POP to:");
    if (!to) return;

    try {
      setEmailing(true);
      setMessage({ type: "", text: "" });
      await postJSON(`/payments/${id}/email-pop`, { to }, token);
      setMessage({ type: "success", text: `Proof of Payment sent to ${to}.` });
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to send POP email." });
    } finally {
      setEmailing(false);
    }
  }

  async function downloadPop() {
    try {
      setDownloading(true);
      setMessage({ type: "", text: "" });
      const base = import.meta.env.VITE_API_BASE || "http://localhost:4000";
      const resp = await fetch(`${base}/payments/${id}/pop.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Failed to download POP");
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `POP-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Download failed." });
    } finally {
      setDownloading(false);
    }
  }

  const isAuthed = Boolean(token);
  const logout = () => {
    setToken?.("");
    setUsername?.("");
  };

  const s = summary || {};

  return (
    <Layout username={username} isAuthed={isAuthed} onLogout={logout}>
      <section className="auth-hero ready paysum-hero">
        {/* Animated Background Orbs */}
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

        <div className="auth-wrap">
          <h1 className="fade-up s1 shimmer-text">Payment Complete</h1>
          <p className="subtitle fade-up s2">
            Reference: <strong className="mono">{s.popRef || id || "(generated)"}</strong>
          </p>

          {/* Success Badge */}
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 26 }).map((_, i) => (
              <i key={i} style={{ "--i": i }} />
            ))}
          </div>
          <div className="success-badge fade-up s2" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" opacity=".35" />
              <path
                d="M7 12.5l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Approved</span>
          </div>

          {/* Status Message */}
          {message.text && (
            <div
              className={`fade-up s2 ${message.type === "error" ? "f-error" : "f-success"}`}
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              {message.text}
            </div>
          )}

          {/* Receipt Card */}
          <div className="auth-card glass fancy-glow fade-up s3 paysum-card">
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <p className="muted">Loading payment details...</p>
              </div>
            ) : (
              <div className="receipt">
                <div className="row big">
                  <div>Amount</div>
                  <div className="mono strong">
                    {s.amount} {s.currency}
                  </div>
                </div>
                <div className="row">
                  <div>Provider</div>
                  <div className="mono">{s.provider || "-"}</div>
                </div>
                <div className="row">
                  <div>Beneficiary</div>
                  <div className="ellipsis">{s.beneficiaryName || "-"}</div>
                </div>
                <div className="row">
                  <div>SWIFT/BIC</div>
                  <div className="mono">{s.beneficiarySwift || "-"}</div>
                </div>
                <div className="row">
                  <div>Created</div>
                  <div>{s.createdAt ? new Date(s.createdAt).toLocaleString() : "-"}</div>
                </div>
                <div className="row">
                  <div>Completed</div>
                  <div>
                    {s.completedAt
                      ? new Date(s.completedAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </div>
                </div>
                <div className="tear" aria-hidden="true" />
              </div>
            )}

            {/* Actions */}
            <div className="actions" style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexDirection: "column" }}>
              <button
                className="btn solid xlg shimmer cta-magnet"
                onClick={downloadPop}
                disabled={downloading || loading}
              >
                {downloading ? "Generating PDF..." : "Download POP (PDF)"}
              </button>
              <button
                className="btn ghost xlg"
                onClick={emailPop}
                disabled={emailing || loading}
              >
                {emailing ? "Sending Email..." : "Email POP"}
              </button>
              <button
                className="btn ghost"
                onClick={() => navigate("/payments/history")}
                style={{ opacity: 0.8 }}
              >
                View All Payments
              </button>
            </div>

            <div className="f-secure muted" style={{ textAlign: "center", marginTop: "1.5rem" }}>
              TLS 1.3 • Proof of Payment • MT103 available on request
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}