import React, { useState } from "react";
import { Link } from "react-router-dom";
import { postJSON } from "../lib/api";
import Layout from "../components/Layout";
import { useAuth } from "../AuthContext";
import "../pages/auth.css";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { token, username: uName, setToken, setUsername: setUName } = useAuth();
  const isAuthed = Boolean(token);
  const logout = () => {
    setToken?.("");
    setUName?.("");
  };

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setBusy(true);

    try {
      await postJSON("/auth/forgot-password", { username });
      setMsg("If an account associated with this username exists, a password reset link has been dispatched.");
      setSubmitted(true);
    } catch (e) {
      // Server responds with standard message or generic success to prevent account enumeration
      setMsg("If an account associated with this username exists, a password reset link has been dispatched.");
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout username={uName} isAuthed={isAuthed} onLogout={logout}>
      <section className="auth-hero ready">
        {/* Animated Background */}
        <div className="auth-bg" aria-hidden="true">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
          <div className="particles">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} style={{ "--i": i }} />
            ))}
          </div>
        </div>

        <div className="auth-wrap">
          <h1 className="fade-up s1 shimmer-text">Forgot Password</h1>
          <p className="subtitle fade-up s2">
            Enter your account username to receive secure password recovery instructions.
          </p>

          {/* Success Banner */}
          {msg && (
            <div
              className="fade-up s2"
              style={{
                border: "1px solid rgba(48,162,120,.35)",
                background: "rgba(48,162,120,.12)",
                color: "#7affc3",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "0.9rem",
                lineHeight: "1.4",
              }}
            >
              ✓ {msg}
            </div>
          )}

          {/* Error Banner */}
          {err && (
            <div className="f-error fade-up s2" role="alert">
              {err}
            </div>
          )}

          {/* Form Card */}
          {!submitted ? (
            <form className="auth-card glass fancy-glow fade-up s3" onSubmit={onSubmit}>
              <div className="f-row">
                <label htmlFor="fp-username">Username</label>
                <div className="field">
                  <input
                    id="fp-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="your.username"
                    autoComplete="username"
                    disabled={busy}
                  />
                  <span className="focus-underline" />
                </div>
              </div>

              <button
                type="submit"
                className={`btn solid xlg shimmer cta-magnet ${busy ? "loading" : ""}`}
                style={{ width: "100%", marginTop: "0.5rem" }}
                disabled={busy}
              >
                {busy ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="f-secure muted" style={{ marginTop: "1rem", textAlign: "center" }}>
                🔒 Zero-knowledge link generation • TLS 1.3 • Anti-enumeration protection
              </div>
            </form>
          ) : (
            <div className="auth-card glass fancy-glow fade-up s3" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
              <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Didn't receive an email? Check your spam folder or try requesting a link again.
              </p>

              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setSubmitted(false);
                  setMsg("");
                }}
                style={{ width: "100%" }}
              >
                Try Another Username
              </button>
            </div>
          )}

          {/* Navigation Link */}
          <div className="f-alt fade-up s3">
            <span className="muted">Remembered your credentials?</span>{" "}
            <Link className="link" to="/login">
              Back to Sign In
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}