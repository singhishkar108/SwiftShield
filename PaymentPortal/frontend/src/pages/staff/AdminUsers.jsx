import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Link } from 'react-router-dom';

export default function AdminUsers(){
  const [q,setQ] = useState('');
  const [items,setItems] = useState([]);

  async function load(){
    const res = await api.get('/api/admin/users', { params:{ q, page:1, pageSize:50 } });
    if (res?.ok) setItems(res.items || []);
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="mz-wrap">
      <div className="mz-toolbar">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search user…" />
        <button onClick={load}>Search</button>
      </div>
      <table className="mz-table">
        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Open</th></tr></thead>
        <tbody>
          {items.map(u=>(
            <tr key={u._id}>
              <td>{u.username} – {u.fullName}</td>
              <td>{u.role}</td>
              <td>{u.isDisabled ? 'Disabled' : 'Active'}</td>
              <td><Link to={`/staff/users/${u._id}`} className="btn">View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
