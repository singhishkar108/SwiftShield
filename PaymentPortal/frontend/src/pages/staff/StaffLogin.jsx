// src/pages/staff/StaffLogin.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../AuthContext.jsx";
import { loginStaff } from "../../lib/api.js";
import { reUsername } from "../../lib/validators"; // staff: username only
import Layout from "../../components/Layout";
import ReCaptchaBox from "../../components/ReCaptchaBox";
import "../auth.css"; // reuse the same CSS used by customer login

export default function StaffLogin() {
  const { setToken, setRole, setUsername, setFullName } = useAuth();

  // form state
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showPw, setShowPw] = useState(false);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();

    // front-end validations (staff)
    const localErrors = [];
    if (!reUsername.test(form.username)) localErrors.push("Username invalid");
    if (!form.password) localErrors.push("Password required");
    if (!captchaToken) localErrors.push("Please complete the CAPTCHA");
    if (localErrors.length) return setErrors(localErrors);

    try {
      setBusy(true);
      setErrors([]);
      const res = await loginStaff({
        username: form.username.trim(),
        password: form.password,
        captchaToken, // field name aligned with middleware
      });

      const token = res?.token;
      if (!token) throw new Error("No token returned");

      setToken(token);
      if (res?.role) setRole(res.role);               // "staff" | "admin"
      if (res?.username) setUsername(res.username);
      if (res?.fullName) setFullName(res.fullName);

      // go to staff home; your route guard will allow it now
      window.location.assign("/staff");
    } catch (err) {
      setErrors([err?.message || "Invalid credentials"]);
    } finally {
      setBusy(false);
    }
  }

  // --- tilt/magnet visuals (shared with customer page via auth.css helpers) ---
  const [isReady, setIsReady] = useState(false);
  const cardRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 30);
    return () => clearTimeout(t);
  }, []);

  function handleCardMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(y - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
  }
  function resetTilt() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }
  function handleCtaMove(e) {
    const el = ctaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.06}px, ${y * 0.06}px)`;
  }
  function handleCtaLeave() {
    if (ctaRef.current) ctaRef.current.style.transform = `translate(0,0)`;
  }

  return (
    <Layout username={null} isAuthed={false} onLogout={() => {}}>
      <section className={`auth-hero ${isReady ? "ready" : ""}`}>
        {/* background orbs + particles */}
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
          <h1 className="fade-up s1 shimmer-text">Employee Sign In</h1>
          <p className="subtitle fade-up s2">SwiftShield Bank Inc • Staff Portal</p>

          {errors.length > 0 && (
            <div className="f-error fade-up s2">
              <strong style={{ display: "block", marginBottom: 6 }}>Fix the following:</strong>
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <form
            ref={cardRef}
            className="auth-card glass fancy-glow fade-up s3"
            onSubmit={onSubmit}
            onMouseMove={handleCardMove}
            onMouseLeave={resetTilt}
          >
            {/* Username */}
            <div className="f-row">
              <label htmlFor="username">Username</label>
              <div className="field">
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  required
                  autoComplete="username"
                />
                <span className="focus-underline" />
              </div>
            </div>

            {/* Password with toggle (same UI as customer) */}
            <div className="f-row pw-row">
              <label htmlFor="password">Password</label>
              <div className="field pw-wrap">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  autoComplete="current-password"
                />
                <span className="focus-underline" />
                <button
                  type="button"
                  className={`pw-toggle ${showPw ? "on" : ""}`}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                  onClick={() => setShowPw((s) => !s)}
                >
                  <span className="icon">
                    {showPw ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path
                          d="M9.9 5.1A10.9 10.9 0 0112 5c5.5 0 9.8 3.9 10.9 7-.3.9-1 2.2-2.2 3.5M6.1 6.1C3.5 7.6 1.8 9.8 1.1 12c.7 2.2 2.4 4.4 5 5.9A12 12 0 0012 19c1.1 0 2.1-.1 3.1-.4"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M1.05 12C2.22 8.94 6.48 5 12 5s9.78 3.94 10.94 7c-1.16 3.06-5.42 7-10.94 7S2.22 15.06 1.05 12z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* reCAPTCHA (same UX as customer) */}
            <ReCaptchaBox
              siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={setCaptchaToken}
            />

            {/* Submit button */}
            <button
              ref={ctaRef}
              type="submit"
              className={`btn solid xlg shimmer cta-magnet ${busy ? "loading" : ""}`}
              disabled={busy || !captchaToken}
              onMouseMove={handleCtaMove}
              onMouseLeave={handleCtaLeave}
              style={{ width: "100%" }}
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>

            <div className="f-secure muted" style={{ marginTop: ".8rem", textAlign: "center" }}>
              Protected by TLS 1.3 • reCAPTCHA • CSRF • Rate limiting
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
