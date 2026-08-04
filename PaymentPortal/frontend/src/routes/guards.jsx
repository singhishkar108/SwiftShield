// src/routes/guards.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export function RequireAuth({ children }) {
  const { isLoggedIn, ready } = useAuth();
  if (!ready) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

export function RequireStaff({ children }) {
  const { isLoggedIn, isStaff, isAdmin, ready } = useAuth();
  if (!ready) return null;
  if (!isLoggedIn) return <Navigate to="/staff/login" replace />;
  if (!(isStaff || isAdmin)) return <Navigate to="/" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isLoggedIn, isAdmin, ready } = useAuth();
  if (!ready) return null;
  if (!isLoggedIn) return <Navigate to="/staff/login" replace />;
  if (!isAdmin) return <Navigate to="/staff" replace />;
  return children;
}
