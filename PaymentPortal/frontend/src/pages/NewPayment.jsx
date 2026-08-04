import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postJSON, getJSON } from "../lib/api";
import { useAuth } from "../AuthContext";
import ReCaptchaBox from "../components/ReCaptchaBox";
import Layout from "../components/Layout";
import { reAmount, reSwift, currencyAllow } from "../lib/validators";

import "../pages/auth.css";
import "../pages/dashboard.css";

export default function NewPayment() {
  const navigate = useNavigate();
  const { token, username, setToken, setUsername } = useAuth();
  const isAuthed = Boolean(token);

  const logout = () => {
    setToken("");
    setUsername("");
  };

  // Redirect to login if user accesses payment portal while unauthenticated
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const [form, setForm] = useState({
    amount: "",
    currency: "ZAR",
    provider: "SWIFT",
    beneficiaryName: "",
    beneficiaryAccount: "",
    beneficiarySwift: "",
  });

  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const res = await getJSON("/payments/beneficiaries", token);
        setBeneficiaries(res.beneficiaries || []);
      } catch (e) {
        console.error("Failed to fetch beneficiaries:", e);
      }
    }
    load();
  }, [token]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "beneficiarySwift" ? value.toUpperCase() : value,
    }));
  }

  function selectBeneficiary(b) {
    setForm((prev) => ({
      ...prev,
      beneficiaryName: b.name || "",
      beneficiaryAccount: b.accountNumber || "",
      beneficiarySwift: (b.swift || "").toUpperCase(),
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const localErrors = [];

    if (!reAmount.test(form.amount)) localErrors.push("Invalid payment amount.");
    if (!currencyAllow.has(form.currency)) localErrors.push("Invalid or unsupported currency.");
    if (!form.beneficiaryName.trim()) localErrors.push("Beneficiary name is required.");
    if (!/^\d{8,20}$/.test(form.beneficiaryAccount)) localErrors.push("Invalid account number (8-20 digits required).");
    if (!reSwift.test(form.beneficiarySwift)) localErrors.push("Invalid SWIFT/BIC code format.");
    if (!captchaToken) localErrors.push("Please complete the reCAPTCHA verification.");

    if (localErrors.length) return setErrors(localErrors);

    try {
      setBusy(true);
      setErrors([]);
      const res = await postJSON("/payments", { ...form, saveBeneficiary, captchaToken }, token);
      navigate(`/pay/auth/${res.paymentId}`);
    } catch (err) {
      setErrors([err.message || String(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout username={username} isAuthed={isAuthed} onLogout={logout}>
      <section className="auth-hero ready">
        {/* Animated Orbs & Particles */}
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
          <h1 className="fade-up s1 shimmer-text">New Payment</h1>
          <p className="subtitle fade-up s2">Create a secure international transfer.</p>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="f-error fade-up s2" role="alert">
              <strong style={{ display: "block", marginBottom: 6 }}>Please fix the following:</strong>
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Glass Payment Form */}
          <form className="auth-card glass fancy-glow fade-up s3" onSubmit={onSubmit}>
            {/* Amount & Currency Selection */}
            <div className="two-col">
              <div className="f-row">
                <label htmlFor="amount">Amount</label>
                <div className="field">
                  <input
                    id="amount"
                    name="amount"
                    value={form.amount}
                    onChange={onChange}
                    placeholder="1000.00"
                    inputMode="decimal"
                    required
                  />
                  <span className="focus-underline" />
                </div>
              </div>

              <div className="f-row">
                <label htmlFor="currency">Currency</label>
                <div className="field select">
                  <select id="currency" name="currency" value={form.currency} onChange={onChange}>
                    {Array.from(currencyAllow).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <span className="focus-underline" />
                </div>
              </div>
            </div>

            {/* Provider Rail */}
            <div className="f-row">
              <label htmlFor="provider">Provider</label>
              <div className="field">
                <input id="provider" name="provider" value={form.provider} readOnly />
                <span className="focus-underline" />
              </div>
            </div>

            {/* Saved Beneficiaries Carousel */}
            <div className="bene-wrap">
              <div className="card-head">
                <h3>Saved Beneficiaries</h3>
                <span className="muted">{beneficiaries.length} saved</span>
              </div>

              {beneficiaries.length === 0 ? (
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  No saved beneficiaries found.
                </p>
              ) : (
                <div className="carousel one">
                  <div className="rail">
                    {beneficiaries.map((b) => (
                      <div key={b.id || b.accountNumber} className="bene full">
                        <div className="avatar">{(b.name || "?").slice(0, 1).toUpperCase()}</div>
                        <div className="bene-name">{b.name}</div>
                        <div className="bene-swift mono">Acct: {b.accountNumber}</div>
                        <div className="bene-sub">
                          SWIFT: <span className="mono">{b.swift}</span>
                        </div>
                        <button type="button" className="btn small" onClick={() => selectBeneficiary(b)}>
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Beneficiary Details */}
            <div className="two-col">
              <div className="f-row">
                <label htmlFor="beneficiaryName">Beneficiary Name</label>
                <div className="field">
                  <input
                    id="beneficiaryName"
                    name="beneficiaryName"
                    value={form.beneficiaryName}
                    onChange={onChange}
                    placeholder="e.g. Acme Corp Ltd"
                    required
                  />
                  <span className="focus-underline" />
                </div>
              </div>

              <div className="f-row">
                <label htmlFor="beneficiaryAccount">Beneficiary Account</label>
                <div className="field">
                  <input
                    id="beneficiaryAccount"
                    name="beneficiaryAccount"
                    value={form.beneficiaryAccount}
                    onChange={onChange}
                    inputMode="numeric"
                    placeholder="8-20 digit account no."
                    required
                  />
                  <span className="focus-underline" />
                </div>
              </div>
            </div>

            <div className="f-row">
              <label htmlFor="beneficiarySwift">Beneficiary SWIFT/BIC</label>
              <div className="field">
                <input
                  id="beneficiarySwift"
                  name="beneficiarySwift"
                  value={form.beneficiarySwift}
                  onChange={onChange}
                  placeholder="e.g. SBZA ZA JJ"
                  style={{ textTransform: "uppercase" }}
                  required
                />
                <span className="focus-underline" />
              </div>
            </div>

            {/* Save Option */}
            <div className="f-row">
              <label className="save-inline">
                <input
                  type="checkbox"
                  checked={saveBeneficiary}
                  onChange={(e) => setSaveBeneficiary(e.target.checked)}
                />
                Save beneficiary for future payments
              </label>
            </div>

            {/* reCAPTCHA Verification */}
            <div className="captcha-wrap">
              <span className="captcha-label">Verification</span>
              <div className="captcha-inner">
                <ReCaptchaBox siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} onChange={setCaptchaToken} />
                <span className="captcha-note">Protected against automated transactions & abuse.</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={busy || !captchaToken}
              className={`btn solid xlg shimmer cta-magnet ${busy ? "loading" : ""}`}
              style={{ width: "100%", marginTop: "1rem" }}
            >
              {busy ? "Processing..." : "Pay Now"}
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