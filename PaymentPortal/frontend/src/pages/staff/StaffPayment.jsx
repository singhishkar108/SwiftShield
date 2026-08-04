// src/pages/staff/StaffPayment.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import './staff.payment.css'; // 🌟 new fancy theme

export default function StaffPayment() {
  const { id } = useParams();
  const nav = useNavigate();

  const [p, setP] = useState(null);
  const [loading, setL] = useState(true);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    setL(true);
    try {
      const res = await api.get(`/api/staff/payments/${id}`);
      if (res?.ok) setP(res.item || null);
      else { setP(null); setErr(res?.msg || 'Not found'); }
    } catch (e) {
      setP(null);
      setErr(e?.message || 'Failed to load payment');
    } finally { setL(false); }
  }

  useEffect(() => {
    let alive = true;
    (async () => { if (!alive) return; await load(); })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function verify() {
    setErr('');
    if (!window.confirm('Verify this payment? You will be asked for your approval PIN.')) return;
    const approvalPin = (prompt('Enter approval PIN to verify:') || '').trim();
    try {
      const res = await api.post(`/api/staff/payments/${id}/verify`, { approvalPin, note: note.trim() });
      if (!res?.ok) return setErr(res?.msg || 'Failed to verify');
      await load();
      setNote('');
      alert('Payment verified');
    } catch (e) { setErr(e.message || 'Failed'); }
  }

  async function submitSwift() {
    setErr('');
    if (!window.confirm('Submit to SWIFT? This is final.')) return;
    const approvalPin = (prompt('Enter approval PIN to submit:') || '').trim();
    try {
      const res = await api.post(`/api/staff/payments/${id}/submit-swift`, { approvalPin });
      if (!res?.ok) return setErr(res?.msg || 'Failed to submit');
      alert('Submitted to SWIFT');
      nav('/staff');
    } catch (e) { setErr(e.message || 'Failed'); }
  }

  if (loading) return <div className="mz-wrap mz-loading">Loading…</div>;
  if (!p) return <div className="mz-wrap">{err || 'Not found'}</div>;

  const amountStr = Number.isFinite(+p.amount)
    ? Number(p.amount).toFixed(2)
    : String(p.amount ?? '');

  return (
    <div className="mz-wrap">
      <div className="mz-card fadeIn">
        <h3>Payment #{String(p._id).slice(-6)}</h3>

        <div className="grid2">
          <div><b>Customer</b><div>{p.owner?.username}</div></div>
          <div><b>Status</b><div><span className={`chip chip-${p.status}`}>{p.status}</span></div></div>
          <div><b>Amount</b><div>{amountStr} {p.currency}</div></div>
          <div><b>Provider</b><div>{p.provider}</div></div>
          <div><b>SWIFT</b><div>{p.beneficiarySwift}</div></div>
          {p.maskedAccount && <div><b>Payee account</b><div>{p.maskedAccount}</div></div>}
        </div>

        <div className="mt">
          <textarea
            placeholder="Internal note (optional, no PII)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="actions">
          {(['created', 'pending_auth', 'sent'].includes(p.status)) && (
            <button className="btn" onClick={verify}>Verify</button>
          )}
          {p.status === 'verified' && (
            <button className="btn btn-primary" onClick={submitSwift}>Submit to SWIFT</button>
          )}
          <button className="btn ghost" onClick={() => nav('/staff')}>Back</button>
        </div>

        {err && <p className="mz-err">{err}</p>}
      </div>

      <div className="mz-card mt fadeIn">
        <h4>Audit Trail</h4>
        <ul className="audit">
          {(p.audit || []).map((a, i) => (
            <li key={i}>
              <span>{new Date(a.at).toLocaleString()}</span>
              <span>{a.action}</span>
              <span>{a.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
