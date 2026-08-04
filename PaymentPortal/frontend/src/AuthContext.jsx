// frontend/src/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import api from "./lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // --- state ---
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
  const [fullName, setFullName] = useState(() => localStorage.getItem("fullName") || "");
  const [role, setRole] = useState(() => localStorage.getItem("role") || ""); // staff | admin | customer
  const [ready, setReady] = useState(false); // ✅ new

  // --- persist to localStorage ---
  useEffect(() => {
    token ? localStorage.setItem("token", token) : localStorage.removeItem("token");
  }, [token]);
  useEffect(() => {
    username ? localStorage.setItem("username", username) : localStorage.removeItem("username");
  }, [username]);
  useEffect(() => {
    fullName ? localStorage.setItem("fullName", fullName) : localStorage.removeItem("fullName");
  }, [fullName]);
  useEffect(() => {
    role ? localStorage.setItem("role", role) : localStorage.removeItem("role");
  }, [role]);

  // --- load session from API if token present ---
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (!token) {
          if (!cancelled) setReady(true);
          return;
        }
        const res = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res?.user) {
          const u = res.user;
          setUsername(u.username || "");
          setFullName(u.fullName || "");
          setRole(u.role || "");
        }
      } catch {
        if (!cancelled) {
          setToken("");
          setUsername("");
          setFullName("");
          setRole("");
        }
      } finally {
        if (!cancelled) setReady(true); // ✅ signal guards to render
      }
    }

    setReady(false); // refresh ready state whenever token changes
    hydrate();
    return () => { cancelled = true; };
  }, [token]);

  // --- computed helpers ---
  const isLoggedIn = !!token;
  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const isCustomer = role === "customer";

  const logout = () => {
    setToken("");
    setUsername("");
    setFullName("");
    setRole("");
    localStorage.clear();
  };

  // --- context value ---
  const value = useMemo(
    () => ({
      token, setToken,
      username, setUsername,
      fullName, setFullName,
      role, setRole,
      isLoggedIn, isAdmin, isStaff, isCustomer,
      ready,               // ✅ expose
      logout,
    }),
    [token, username, fullName, role, ready]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
