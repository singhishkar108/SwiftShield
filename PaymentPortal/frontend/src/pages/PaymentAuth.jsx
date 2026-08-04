import React, { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";
import "../pages/auth.css";
import "./pay-auth.css";

export default function PaymentAuth() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, username, setToken, setUsername } = useAuth();

  const [timeLeft, setTimeLeft] = useState(59);
  const [authToken, setAuthToken] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Load auth window status + token from backend
  useEffect(() => {
    let timer;
    async function load() {
      try {
        const res = await getJSON(`/payments/${id}/auth`, token);
        if (res.status === "expired") {
          setError("Authentication window expired. Go back and try again.");
          setTimeLeft(0);
          setAuthToken(null);
          return;
        }
        setAuthToken(res.token);
        setTimeLeft(res.remainingSeconds ?? 59);
      } catch (e) {
        setError(e.message || "Failed to load auth window.");
      }
    }
    load();

    // 1-second countdown
    timer = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [id, token]);

  async function confirmAuth() {
    if (disabled || busy) return;
    try {
      setBusy(true);
      setError("");
      await postJSON(`/payments/${id}/approve`, { token: authToken }, token);

      // Fetch summary for the next page
      const { summary } = await getJSON(`/payments/${id}/summary`, token);
      navigate(`/payments/${id}/summary`, { state: summary });
    } catch (e) {
      setError(e.message || "Approval failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = timeLeft <= 0 || !authToken || busy;
  const isAuthed = Boolean(token);
  const logout = () => {
    setToken("");
    setUsername("");
  };

  // SVG Progress Ring calculations
  const R = 56; // Radius
  const C = useMemo(() => 2 * Math.PI * R, []); // Circumference
  const pct = Math.max(0, Math.min(100, (timeLeft / 59) * 100));
  const dash = useMemo(() => `${(pct / 100) * C} ${C}`, [pct, C]);

  return (
    <Layout username={username} isAuthed={isAuthed} onLogout={logout}>
      <section className="auth-hero ready payauth-hero">
        {/* Animated Background */}
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
          <h1 className="fade-up s1 shimmer-text">Authenticate Your Payment</h1>
          <p className="subtitle fade-up s2">
            For your security, approve this transaction within <strong>{timeLeft}s</strong>.
          </p>

          {error && (
            <div className="f-error fade-up s2" role="alert">
              {error}
            </div>
          )}

          <div className="auth-card glass fancy-glow fade-up s3 payauth-card">
            {/* Countdown Ring + Flip Counter */}
            <div className="ring-wrap">
              <svg className="ring" viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3aa0ff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#7b5cff" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <circle className="track" cx="70" cy="70" r={R} />
                <circle
                  className="progress"
                  cx="70"
                  cy="70"
                  r={R}
                  stroke="url(#grad)"
                  strokeDasharray={dash}
                />
              </svg>

              <div className={`flip ${timeLeft === 0 ? "expired" : ""}`} aria-live="polite">
                <span className="flip-top">{String(timeLeft).padStart(2, "0")}</span>
                <span
                  className="flip-bottom"
                  data-next={String(Math.max(timeLeft - 1, 0)).padStart(2, "0")}
                >
                  {String(timeLeft).padStart(2, "0")}
                </span>
                <div className="sec-label">seconds</div>
              </div>
            </div>

            {/* Secure Steps / Hints */}
            <ul className="hints">
              <li className="hint">
                <span className="dot" />
                Open your banking app
              </li>
              <li className="hint">
                <span className="dot" />
                Approve the pending push notification
              </li>
              <li className="hint">
                <span className="dot" />
                Return here and click confirm
              </li>
            </ul>

            {/* Actions */}
            {timeLeft > 0 ? (
              <button
                onClick={confirmAuth}
                disabled={disabled}
                className={`btn solid xlg shimmer cta-magnet approve-btn ${disabled ? "disabled" : ""} ${
                  busy ? "loading" : ""
                }`}
                style={{ width: "100%" }}
              >
                {busy ? "Confirming..." : "I approve in my banking app"}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", width: "100%" }}>
                <p className="expired-note">
                  Authentication window expired. Please initiate a new transfer.
                </p>
                <button
                  type="button"
                  className="btn ghost xlg"
                  onClick={() => navigate("/payments")}
                  style={{ width: "100%" }}
                >
                  Return to New Payment
                </button>
              </div>
            )}

            {/* Subtle Security Footer */}
            <div className="f-secure muted" style={{ marginTop: "1.25rem", textAlign: "center" }}>
              TLS 1.3 • Device Binding • Rate Limiting • Push Authentication
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}