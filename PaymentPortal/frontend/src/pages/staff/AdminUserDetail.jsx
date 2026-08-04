import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';

export default function AdminUserDetail(){
  const { id } = useParams();
  const [u,setU] = useState(null);
  const [payments,setP] = useState([]);

  async function load(){
    const [a,b] = await Promise.all([
      api.get(`/api/admin/users/${id}`),
      api.get(`/api/admin/users/${id}/payments`)
    ]);
    setU(a?.item || null);
    setP(b?.items || []);
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [id]);

  async function toggle(){
    await api.post(`/api/admin/users/${id}/toggle`);
    await load();
  }

  if (!u) return <div className="mz-wrap">Loading…</div>;

  return (
    <div className="mz-wrap">
      <div className="mz-card">
        <h3>{u.username}</h3>
        <p>{u.fullName}</p>
        <p>Role: {u.role}</p>
        <p>Status: {u.isDisabled ? 'Disabled' : 'Active'}</p>
        <button className="btn" onClick={toggle}>{u.isDisabled ? 'Enable' : 'Disable'}</button>
      </div>

      <div className="mz-card mt">
        <h4>{u.username}'s Payments</h4>
        <table className="mz-table">
          <thead><tr><th>Amount</th><th>Currency</th><th>SWIFT</th><th>Status</th><th>Open</th></tr></thead>
          <tbody>
            {payments.map(p=>(
              <tr key={p._id}>
                <td>{Number(p.amount).toFixed(2)}</td>
                <td>{p.currency}</td>
                <td>{p.beneficiarySwift}</td>
                <td>{p.status}</td>
                <td><a href={`/staff/payments/${p._id}`} className="btn">Open</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
