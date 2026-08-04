
// src/pages/staff/StaffLayout.jsx
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../../AuthContext";

export default function StaffLayout(){
  const { username, role, logout, isAdmin } = useAuth();

  return (
    <div className="mz-shell">
      <header className="mz-topbar">
        <nav className="left">
          <Link to="/staff">Payments</Link>
          {isAdmin && <Link to="/staff/users">Users</Link>}
        </nav>
        <div className="right">
          <span>{username} ({role})</span>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="mz-main">
        <Outlet />
      </main>
    </div>
  );
}
