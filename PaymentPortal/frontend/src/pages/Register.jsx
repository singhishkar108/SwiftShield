import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postJSON } from "../lib/api";
import {
  reFullName, reSAIdNumber, reAccountNumber, reUsername,
  validatePasswordClient
} from "../lib/validators";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";
import PasswordStrength from "../components/PasswordStrength";
import ReCaptchaBox from "../components/ReCaptchaBox";
import "../pages/auth.css";

export default function Register() {
  const navigate = useNavigate();
  const { setToken, setUsername, setFullName } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    idNumber: "",
    accountNumber: "",
    email: "",
    username: "",
    password: ""
  });

  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  // fancy FX
  const [isReady, setIsReady] = useState(false);
  const cardRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 30);
    return () => clearTimeout(t);
  }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Parallax tilt
  function handleCardMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * -6;
    const ry = (x - 0.5) * 10;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--tx", `${(ry / 10) * 6}px`);
    el.style.setProperty("--ty", `${(rx / 6) * -6}px`);
  }
  function resetTilt() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
    el.style.setProperty("--tx", `0px`);
    el.style.setProperty("--ty", `0px`);
  }

  // Magnetic CTA
  function handleCtaMove(e) {
    const el = ctaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.06}px, ${y * 0.06}px)`;
  }
  function handleCtaLeave() {
    const el = ctaRef.current;
    if (!el) return;
    el.style.transform = `translate(0,0)`;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const localErrors = [];

    if (!reFullName.test(form.fullName)) localErrors.push("Full name invalid");
    if (!reSAIdNumber.test(form.idNumber)) localErrors.push("ID number invalid (13 digits)");
    if (!reAccountNumber.test(form.accountNumber)) localErrors.push("Account number invalid (8–16 digits)");
    if (!reUsername.test(form.username)) localErrors.push("Username invalid");

    const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!reEmail.test(form.email)) localErrors.push("Email invalid");

    const pwErrs = validatePasswordClient(form.password, {
      username: form.username,
      name: form.fullName
    });
    if (pwErrs.length) localErrors.push(...pwErrs.map(e => `Password: ${e}`));

    // ✅ Check CAPTCHA here (button isn’t gated)
    if (!captchaToken) localErrors.push("Please complete the CAPTCHA");

    if (localErrors.length) {
      setErrors(localErrors);
      return;
    }

    try {
      setBusy(true);
      setErrors([]);
      const res = await postJSON("/auth/register", { ...form, captchaToken });
      setToken(res.token);
      setUsername(res.username);
      if (res.fullName && setFullName) setFullName(res.fullName);
      navigate("/welcome");
    } catch (err) {
      setErrors([err?.message || "Registration failed. Please try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout username={null} isAuthed={false} onLogout={() => {}}>
      <section className={`auth-hero ${isReady ? "ready" : ""}`}>
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
          <h1 className="fade-up s1 shimmer-text">Open your SwiftShield account</h1>
          <p className="subtitle fade-up s2">Secure onboarding with bank-grade protection.</p>

          {errors.length > 0 && (
            <div className="f-error fade-up s2" style={{ lineHeight: 1.25 }}>
              <strong style={{ display: "block", marginBottom: 6 }}>Fix the following:</strong>
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <form
            ref={cardRef}
            className="auth-card glass fancy-glow fade-up s3"
            onSubmit={onSubmit}
            onMouseMove={handleCardMove}
            onMouseLeave={resetTilt}
            autoComplete="on"
            style={{ margin: "1.4rem auto 2rem" }}
          >
            <div className="f-row">
              <label htmlFor="fullName">Full name</label>
              <div className="field">
                <input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={onChange}
                  placeholder="e.g., John D-Lionel"
                  required
                  autoComplete="name"
                />
                <span className="focus-underline" />
              </div>
            </div>

            <div className="f-row">
              <label htmlFor="idNumber">South African ID (13 digits)</label>
              <div className="field">
                <input
                  id="idNumber"
                  name="idNumber"
                  value={form.idNumber}
                  onChange={onChange}
                  inputMode="numeric"
                  placeholder="e.g., 9001011234087"
                  required
                  autoComplete="off"
                />
                <span className="focus-underline" />
              </div>
            </div>

            <div className="f-row">
              <label htmlFor="accountNumber">Account number</label>
              <div className="field">
                <input
                  id="accountNumber"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={onChange}
                  inputMode="numeric"
                  placeholder="8–16 digits"
                  required
                  autoComplete="off"
                />
                <span className="focus-underline" />
              </div>
            </div>

            <div className="f-row">
              <label htmlFor="email">Email</label>
              <div className="field">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <span className="focus-underline" />
              </div>
            </div>

            <div className="f-row">
              <label htmlFor="username">Username</label>
              <div className="field">
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  placeholder="john.lionel"
                  required
                  autoComplete="username"
                />
                <span className="focus-underline" />
              </div>
            </div>

            <div className="f-row pw-row">
              <label htmlFor="password">Password</label>
              <div className="pw-wrap field">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="min 12 chars, upper/lower/digit/symbol"
                  required
                  autoComplete="new-password"
                />
                <span className="focus-underline" />
                <button
                  type="button"
                  className={`pw-toggle ${showPw ? "on" : ""}`}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                  onClick={() => setShowPw(s => !s)}
                >
                  <span className="icon">
                    {showPw ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        <path d="M9.9 5.1A10.9 10.9 0 0112 5c5.5 0 9.8 3.9 10.9 7-.3.9-1 2.2-2.2 3.5M6.1 6.1C3.5 7.6 1.8 9.8 1.1 12c.7 2.2 2.4 4.4 5 5.9A12 12 0 0012 19c1.1 0 2.1-.1 3.1-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M1.05 12C2.22 8.94 6.48 5 12 5s9.78 3.94 10.94 7c-1.16 3.06-5.42 7-10.94 7S2.22 15.06 1.05 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
                      </svg>
                    )}
                  </span>
                </button>
              </div>

              <div style={{ marginTop: ".4rem" }}>
                <PasswordStrength password={form.password} />
              </div>
            </div>

         {/* ✅ mandatory reCAPTCHA */} <ReCaptchaBox siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} onChange={setCaptchaToken} />

            <button
              ref={ctaRef}
              type="submit"
              className={`btn solid xlg shimmer cta-magnet ${busy ? "loading" : ""}`}
              disabled={busy}                             
              onMouseMove={handleCtaMove}
              onMouseLeave={handleCtaLeave}
              style={{ width: "100%" }}
            >
              {busy ? "Creating..." : "Create account"}
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
