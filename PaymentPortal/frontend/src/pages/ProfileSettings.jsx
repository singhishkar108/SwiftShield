// frontend/src/pages/ProfileSettings.jsx
import React, { useState } from "react";
import { postJSON } from "../lib/api";
import { useAuth } from "../AuthContext";

export default function ProfileSettings() {
  const { token, setToken } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr("");
    if (form.newPassword !== form.confirm) { setErr("Passwords do not match"); return; }
    try {
      const res = await postJSON("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      }, token);
      // rotate token
      setToken(res.token);
      setMsg("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e2) {
      setErr(e2.message || "Failed to change password");
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "40px auto" }}>
      <h2>Profile Settings</h2>
      {msg && <div style={{ background:"#efe", border:"1px solid #9c9", padding:10, borderRadius:8 }}>{msg}</div>}
      {err && <div style={{ background:"#fee", border:"1px solid #f99", padding:10, borderRadius:8 }}>{err}</div>}
      <form onSubmit={onSubmit}>
        <label>Current password</label>
        <input type="password" name="currentPassword" value={form.currentPassword} onChange={onChange} required />

        <label style={{marginTop:8}}>New password</label>
        <input type="password" name="newPassword" value={form.newPassword} onChange={onChange} required />

        <label style={{marginTop:8}}>Confirm new password</label>
        <input type="password" name="confirm" value={form.confirm} onChange={onChange} required />

        <button style={{marginTop:12}}>Update password</button>
      </form>
    </div>
  );
}
