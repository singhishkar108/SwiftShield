import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getJSON } from "../lib/api";
import Layout from "../components/Layout";
import "../pages/auth.css";
import "../pages/dashboard.css";

export default function Splash() {
  const { username, fullName, token } = useAuth();
  const display = fullName || username || "there";

  // ---------- LIVE PAYMENTS ----------
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [payErr, setPayErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoadingPayments(true);
        setPayErr("");
        const res = await getJSON("/payments", token);
        if (!alive) return;
        setPayments(Array.isArray(res?.payments) ? res.payments : []);
      } catch (e) {
        if (!alive) return;
        setPayErr(e?.message || "Unable to load payments.");
      } finally {
        if (alive) setLoadingPayments(false);
      }
    }
    if (token) load();
    return () => { alive = false; };
  }, [token]);

  // Take the 6 most recent by createdAt desc
  const recent = useMemo(() => {
    const arr = [...(payments || [])];
    arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return arr.slice(0, 6);
  }, [payments]);

  // KPI demo + “payments this month” from live data
  const paymentsThisMonth = useMemo(() => {
    const now = new Date();
    const ym = (d) => `${d.getFullYear()}-${d.getMonth()}`;
    return recent.filter(p => ym(new Date(p.createdAt)) === ym(now)).length;
  }, [recent]);

  const kpis = [
    { label: "Available balance", value: 25340.76, ccy: "USD" }, // demo
    { label: "Held for payments", value: 1780.0, ccy: "USD" },   // demo
    { label: "Payments this month", value: paymentsThisMonth, ccy: "" },
    { label: "Beneficiaries", value: 9, ccy: "" },               // demo
  ];

  // animated counters for KPIs
  const [animated, setAnimated] = useState([0, 0, 0, 0]);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const from = [0, 0, 0, 0];
    const to = kpis.map(k => k.value);
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setAnimated(to.map((val, i) => from[i] + (val - from[i]) * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paymentsThisMonth]);

  // tiny sparkline data (demo)
  const spark = useMemo(() => {
    const pts = Array.from({ length: 30 }, (_, i) => {
      const base = 24000 + Math.sin(i / 3) * 800 + (i * 25);
      return Math.round(base + (Math.random() * 600 - 300));
    });
    return pts;
  }, []);

  const statusClass = (s) =>
    s === "Settled" ? "chip success" : s === "Processing" ? "chip warn" : "chip danger";

  // ---------- LIVE BENEFICIARIES (single-card scroller) ----------
  const [benes, setBenes] = useState([]);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await getJSON("/payments/beneficiaries", token);
        if (!alive) return;
        setBenes(Array.isArray(res?.beneficiaries) ? res.beneficiaries : []);
      } catch { /* ignore */ }
    }
    if (token) load();
    return () => { alive = false; };
  }, [token]);

  // CTA magnetic
  const ctaRef = useRef(null);
  function handleCtaMove(e) {
    const el = ctaRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.06}px, ${y * 0.06}px)`;
  }
  function handleCtaLeave() { if (ctaRef.current) ctaRef.current.style.transform = "translate(0,0)"; }

  return (
    <Layout isAuthed={true} username={username} onLogout={() => {}}>
      <section className="auth-hero ready">
        {/* background layer */}
        <div className="auth-bg" aria-hidden="true">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
          <div className="particles">
            {Array.from({ length: 36 }).map((_, i) => <span key={i} style={{ "--i": i }} />)}
          </div>
        </div>

        <div className="dash-wrap">
          {/* Header */}
          <div className="dash-header fade-up s1">
            <div>
              <h1 className="shimmer-text">Welcome, {display}! 🎉</h1>
              <p className="subtitle">Your SwiftShield International Payments dashboard.</p>
            </div>
            <Link
              to="/pay/new"
              className="btn solid xlg shimmer"
              ref={ctaRef}
              onMouseMove={handleCtaMove}
              onMouseLeave={handleCtaLeave}
            >
              Make a new payment
            </Link>
          </div>

          {/* KPI cards */}
          <div className="kpi-grid fade-up s2">
            {kpis.map((k, i) => (
              <div className="kpi glass fancy-glow" key={k.label}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">
                  {k.ccy && <span className="ccy">{k.ccy}</span>}
                  {k.ccy
                    ? animated[i].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : Math.round(animated[i]).toLocaleString()}
                </div>
                <Sparkline data={spark.slice(i * 6, i * 6 + 12)} />
              </div>
            ))}
          </div>

          {/* FX ticker (demo) */}
          <div className="fx-ticker fade-up s2" role="marquee" aria-label="FX rates">
            <div className="fx-track">
              {[
                { pair: "USD/ZAR", rate: 18.42 },
                { pair: "EUR/USD", rate: 1.06 },
                { pair: "GBP/USD", rate: 1.22 },
                { pair: "USD/JPY", rate: 149.8 },
                { pair: "USD/SGD", rate: 1.36 },
              ].concat([
                { pair: "USD/ZAR", rate: 18.42 },
                { pair: "EUR/USD", rate: 1.06 },
                { pair: "GBP/USD", rate: 1.22 },
                { pair: "USD/JPY", rate: 149.8 },
                { pair: "USD/SGD", rate: 1.36 },
              ]).map((r, idx) => (
                <div className="fx-pill" key={idx}>
                  <span>{r.pair}</span>
                  <strong>{r.rate}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Two columns: recent payments (LIVE) + beneficiaries (LIVE) */}
          <div className="two-col fade-up s3">
            {/* Recent payments (from /payments) */}
            <div className="card glass fancy-glow">
              <div className="card-head">
                <h3>Recent payments</h3>
                <Link to="/history" className="link">View all</Link>
              </div>

              {loadingPayments && <div className="muted" style={{ padding: ".6rem" }}>Loading…</div>}
              {payErr && <div className="f-error" style={{ margin: ".4rem 0" }}>{payErr}</div>}

              {!loadingPayments && !payErr && recent.length === 0 && (
                <div className="muted" style={{ padding: ".6rem" }}>No payments yet</div>
              )}

              {!loadingPayments && !payErr && recent.length > 0 && (
                <div className="table">
                  <div className="tr th">
                    <div>Reference</div>
                    <div>Beneficiary</div>
                    <div className="right">Amount</div>
                    <div>Status</div>
                    <div>Date</div>
                  </div>

                  {recent.map(p => (
                    <Link to={`/history/${p.id}`} key={p.id} className="tr">
                      <div className="cell mono ref" title={p.id}>
                        {((s)=>s&&s.length>14?`${s.slice(0,6)}…${s.slice(-4)}`:s||"—")(p.id)}
                      </div>
                      <div className="cell benef" title={p.beneficiaryName || p.provider || "—"}>
                        {((s)=>s&&s.length>22?`${s.slice(0,18)}…`:s||"—")(p.beneficiaryName || p.provider)}
                      </div>
                      <div className="cell right amt" title={`${p.currency} ${Number(p.amount).toLocaleString()}`}>
                        {p.currency}{'\u00A0'}{Number(p.amount).toLocaleString()}
                      </div>
                      <div className="cell status"><span className={statusClass(p.status || "")}>{p.status || "—"}</span></div>
                      <div className="cell muted date" title={safeDate(p.createdAt)}>{safeDate(p.createdAt)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Beneficiaries — single-card horizontal scroller with deep link */}
            <div className="card glass fancy-glow">
              <div className="card-head">
                <h3>Beneficiaries</h3>
                <Link to="/beneficiaries" className="link">Manage</Link>
              </div>

              {benes.length === 0 ? (
                <div className="muted" style={{ padding: ".6rem" }}>No saved beneficiaries</div>
              ) : (
                <div className="carousel one" tabIndex={0}>
                  <div className="rail">
                    {benes.map((b) => (
                      <div className="bene full" key={b.id} title={`${b.name} • ${b.accountNumber} • ${b.swift}`}>
                        <div className="avatar">{(b.name || "?")[0]}</div>
                        <div className="bene-name">{b.name}</div>
                        <div className="bene-sub">Acct • {((s)=>s&&s.length>20?`${s.slice(0,16)}…`:s||"—")(b.accountNumber)}</div>
                        <div className="bene-swift mono">{b.swift}</div>
                        <div className="bene-last muted">Last paid —</div>

                        <Link
                          className="btn solid small"
                          to={`/pay/new?name=${encodeURIComponent(b.name)}&account=${encodeURIComponent(b.accountNumber)}&swift=${encodeURIComponent(b.swift || "")}`}
                        >
                          Pay
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="tips">
                Tip: Swipe or use <span className="kbd">⇧</span><span className="kbd">Scroll</span> to move the carousel.
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="quick-actions fade-up s3">
            <Link to="/pay/templates" className="qa glass">Templates</Link>
            <Link to="/rates" className="qa glass">Rate alerts</Link>
            <Link to="/limits" className="qa glass">Limits</Link>
            <Link to="/support" className="qa glass">Support</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

/** helpers */
function safeDate(dt) {
  try { return new Date(dt).toLocaleString(); }
  catch { return "—"; }
}

function Sparkline({ data = [] }) {
  if (!data.length) return null;
  const w = 140, h = 40, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = Math.max(1, max - min);
  const step = (w - pad*2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad*2) * (1 - (v - min) / range);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="spark">
      <polyline points={pts} pathLength="1" />
    </svg>
  );
}
