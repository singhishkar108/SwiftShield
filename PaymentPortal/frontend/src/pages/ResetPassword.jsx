// frontend/src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { postJSON } from "../lib/api";
import { useAuth } from "../AuthContext";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const nav = useNavigate();
  const { setToken } = useAuth();

  const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault(); setMsg(""); setErr("");
    if (pw1 !== pw2) { setErr("Passwords do not match"); return; }
    try {
      const res = await postJSON("/auth/reset-password", { token, newPassword: pw1 });
      setToken(res.token); // logged in after reset
      setMsg("Password reset successful. Redirecting...");
      setTimeout(()=> nav("/welcome"), 800);
    } catch (e2) {
      setErr(e2.message || "Reset failed");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto" }}>
      <h2>Reset Password</h2>
      {msg && <div style={{ background:"#efe", border:"1px solid #9c9", padding:10, borderRadius:8 }}>{msg}</div>}
      {err && <div style={{ background:"#fee", border:"1px solid #f99", padding:10, borderRadius:8 }}>{err}</div>}
      <form onSubmit={onSubmit}>
        <label>New password</label>
        <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} required />
        <label style={{marginTop:8}}>Confirm password</label>
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} required />
        <button style={{marginTop:12}}>Set new password</button>
      </form>
    </div>
  );
}
