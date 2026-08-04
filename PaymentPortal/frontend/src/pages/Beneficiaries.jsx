import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../lib/api";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";

// Reuse existing UI styling
import "../pages/auth.css";
import "../pages/dashboard.css";

export default function Beneficiaries() {
  const navigate = useNavigate();
  const { token, username, setToken, setUsername } = useAuth();
  const isAuthed = Boolean(token);

  const logout = () => {
    setToken("");
    setUsername("");
  };

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  // Modal State for Adding New Beneficiary
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState({
    name: "",
    accountNumber: "",
    swift: "",
    bankName: "",
  });

  // Fetch Beneficiaries
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setBusy(true);
        const res = await getJSON("/payments/beneficiaries", token);
        if (!mounted) return;
        setItems(res.beneficiaries || []);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load beneficiaries list.");
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Client-side search filtering
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(s) ||
        (b.accountNumber || "").toLowerCase().includes(s) ||
        (b.swift || "").toLowerCase().includes(s) ||
        (b.bankName || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  // Navigate to payment creation with pre-filled beneficiary info
  const handleUseBeneficiary = (beneficiary) => {
    navigate("/payments", { state: { beneficiary } });
  };

  // Save new beneficiary handler
  const handleSaveBeneficiary = async (e) => {
    e.preventDefault();
    if (!form.name || !form.accountNumber || !form.swift) {
      setAddError("Please fill in all required fields.");
      return;
    }

    try {
      setSaving(true);
      setAddError("");
      const res = await postJSON("/payments/beneficiaries", form, token);
      
      // Update local state list
      setItems((prev) => [res.beneficiary || form, ...prev]);
      setShowAddModal(false);
      setForm({ name: "", accountNumber: "", swift: "", bankName: "" });
    } catch (err) {
      setAddError(err.message || "Failed to save beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout username={username} isAuthed={isAuthed} onLogout={logout}>
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

        <div className="dash-wrap">
          {/* Header & Main Actions */}
          <div className="dash-header fade-up s1">
            <div>
              <h1 className="shimmer-text">Beneficiaries</h1>
              <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                Manage verified account payees for swift international transfers.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn ghost"
                onClick={() => setShowAddModal(true)}
              >
                + Add Beneficiary
              </button>
              <Link className="btn solid" to="/payments">
                New Payment
              </Link>
            </div>
          </div>

          {/* Quick Filter & Counter Card */}
          <div className="card glass fade-up s2" style={{ padding: "14px 18px", marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div className="muted" style={{ fontSize: "0.88rem" }}>
                <strong>{filtered.length}</strong> Saved Payees
              </div>

              <div className="field" style={{ minWidth: 240, flex: "0 0 320px", margin: 0 }}>
                <input
                  placeholder="🔍 Search name, account, or SWIFT..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <span className="focus-underline" />
              </div>
            </div>
          </div>

          {/* Beneficiaries Table */}
          <div className="card glass fade-up s3">
            <div className="table">
              <div className="tr th">
                <div>Beneficiary</div>
                <div>Account Number</div>
                <div>SWIFT / BIC</div>
                <div className="right">Actions</div>
                <div className="right">Added Date</div>
              </div>

              {/* Loading Skeleton */}
              {busy && (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="tr" aria-busy="true" style={{ opacity: 0.6 }}>
                      <div className="cell ref">
                        <div className="skeleton" style={{ width: "60%" }} />
                      </div>
                      <div className="cell benef">
                        <div className="skeleton" style={{ width: "70%" }} />
                      </div>
                      <div className="cell amt">
                        <div className="skeleton" style={{ width: "40%" }} />
                      </div>
                      <div className="cell status right">
                        <div className="skeleton" style={{ width: "80px", marginLeft: "auto" }} />
                      </div>
                      <div className="cell date right">
                        <div className="skeleton" style={{ width: "100px", marginLeft: "auto" }} />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Error Message */}
              {!busy && error && (
                <div className="tr">
                  <div className="cell" style={{ gridColumn: "1 / -1", color: "#fca5a5", padding: "16px" }}>
                    ⚠️ {error}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!busy && !error && filtered.length === 0 && (
                <div className="tr">
                  <div className="cell" style={{ gridColumn: "1 / -1", padding: "24px 16px", textAlign: "center" }}>
                    <span className="muted">No beneficiaries match your search criteria.</span>
                  </div>
                </div>
              )}

              {/* Beneficiary Data Rows */}
              {!busy &&
                !error &&
                filtered.map((b) => (
                  <div key={b.id || b.accountNumber} className="tr">
                    <div className="cell ref">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          className="avatar"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            fontSize: 12,
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {(b.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <strong className="bene-name" style={{ display: "block" }}>{b.name}</strong>
                          {b.bankName && <span className="muted" style={{ fontSize: "0.75rem" }}>{b.bankName}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="cell benef mono" style={{ letterSpacing: "0.03em" }}>
                      {b.accountNumber}
                    </div>

                    <div className="cell mono muted" style={{ fontSize: "0.85rem" }}>
                      {b.swift}
                    </div>

                    <div className="cell right">
                      <button
                        className="btn small solid"
                        onClick={() => handleUseBeneficiary(b)}
                        title="Initiate transfer to this account"
                      >
                        Pay Now
                      </button>
                    </div>

                    <div className="cell date right muted" style={{ fontSize: "0.82rem" }}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "Saved"}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Footer Security Tag */}
          <div className="f-secure muted" style={{ textAlign: "center", marginTop: 16, fontSize: "0.8rem" }}>
            🔒 All beneficiary details are encrypted at rest • Verified against global AML/KYC sanctions registries
          </div>
        </div>
      </section>

      {/* Add Beneficiary Modal Dialog */}
      {showAddModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            className="card glass"
            style={{ width: "100%", maxWidth: "460px", padding: "24px" }}
          >
            <h3>Add New Beneficiary</h3>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
              Save payee details to streamline future cross-border transactions.
            </p>

            {addError && (
              <div style={{ color: "#fca5a5", fontSize: "0.85rem", marginBottom: "12px" }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleSaveBeneficiary} style={{ display: "grid", gap: "12px" }}>
              <div className="field">
                <label style={{ fontSize: "0.8rem" }} className="muted">Full Name / Entity Name *</label>
                <input
                  required
                  placeholder="e.g. Acme Corp"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: "0.8rem" }} className="muted">Account Number / IBAN *</label>
                <input
                  required
                  placeholder="e.g. GB33BUKB20201555555555"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: "0.8rem" }} className="muted">SWIFT / BIC Code *</label>
                <input
                  required
                  placeholder="e.g. BUKBGB22"
                  value={form.swift}
                  onChange={(e) => setForm({ ...form, swift: e.target.value })}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: "0.8rem" }} className="muted">Bank Name (Optional)</label>
                <input
                  placeholder="e.g. Barclays Bank PLC"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn solid" disabled={saving}>
                  {saving ? "Saving..." : "Save Payee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}