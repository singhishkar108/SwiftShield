// src/pages/staff/StaffQueue.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import "./staff.queue.css"; // ✅ styles only

export default function StaffQueue() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "" = All
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get("/api/staff/payments", {
        params: { q, status, page, pageSize: 20 },
      });
      if (res?.ok) {
        setItems(res.items || []);
        setTotal(res.total || 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (e) {
      setErr(e?.message || "Failed to load payments");
      setItems([]);
      setTotal(0);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  function onKeyDown(e) {
    if (e.key === "Enter") {
      setPage(1);
      load();
    }
  }

  const hasRows = items.length > 0;

  return (
    <div className="mz-wrap">
      <div className="mz-pageHead">
        <h1 className="mz-pageTitle">Payments</h1>
        <div className="mz-subtle">
          {total ? `${total} record${total === 1 ? "" : "s"} found` : "—"}
        </div>
      </div>

      <div className="mz-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search SWIFT or user"
          aria-label="Search"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Status filter"
        >
          <option value="">All</option>
          <option value="created">Created</option>
          <option value="pending_auth">Pending Auth</option>
          <option value="sent">Sent</option>
          <option value="verified">Verified</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={() => { setPage(1); load(); }}>Search</button>
      </div>

      {err && <div className="mz-card mz-err">{err}</div>}

      <table className="mz-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Amount</th>
            <th>Currency</th>
            <th>SWIFT</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {!hasRows ? (
            <tr>
              <td colSpan={6} className="mz-empty">
                No payments found{status ? ` for status "${status}"` : ""}.
              </td>
            </tr>
          ) : (
            items.map((x) => (
              <tr key={x._id}>
                <td>{x.owner?.username}</td>
                <td>{isFinite(+x.amount) ? Number(x.amount).toFixed(2) : x.amount}</td>
                <td>{x.currency}</td>
                <td>{x.beneficiarySwift}</td>
                <td>
                  <span className={`chip chip-${x.status}`}>{x.status}</span>
                </td>
                <td>
                  <Link to={`/staff/payments/${x._id}`} className="btn">
                    Open
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
