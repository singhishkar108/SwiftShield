// src/lib/api.js

// Prefer explicit env; otherwise fall back to localhost:4001 (HTTPS).
const API_BASE =
  (import.meta.env.VITE_API_BASE && import.meta.env.VITE_API_BASE.replace(/\/+$/, "")) ||
  "https://localhost:4001";

function toQuery(params) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.append(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// Generic request helper with timeout + JSON/text parsing
async function req(method, path, optsOrBody, token) {
  const isGetLike = method === "GET" || method === "DELETE";
  const hasOptions =
    optsOrBody && typeof optsOrBody === "object" && !Array.isArray(optsOrBody) && isGetLike;

  const params = hasOptions ? optsOrBody.params : undefined;
  const extraHeaders = hasOptions ? optsOrBody.headers : undefined;
  const body = !hasOptions ? optsOrBody : undefined;

  const url = `${API_BASE}${path}${toQuery(params)}`;
  const auth = token || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : "");

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        ...(extraHeaders || {}),
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      credentials: "include",
      mode: "cors",
      signal: ac.signal,
    });
  } catch (e) {
    clearTimeout(t);
    throw new Error(e?.name === "AbortError" ? "Request timed out" : `Network error: ${e?.message || e}`);
  }
  clearTimeout(t);

  const ct = res.headers.get("content-type") || "";
  let data = null;
  if (ct.includes("application/json")) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    try { data = await res.text(); } catch { data = null; }
  }

  if (!res.ok) {
    if (data && typeof data === "object") {
      const parts = [];
      if (data.error) parts.push(data.error);
      if (data.msg) parts.push(data.msg);
      if (Array.isArray(data.errors)) parts.push(data.errors.join(", "));
      if (Array.isArray(data.reason)) parts.push(data.reason.join(", "));
      const msg = parts.filter(Boolean).join(" | ");
      throw new Error(msg || `HTTP ${res.status}`);
    }
    throw new Error(typeof data === "string" && data.trim() ? data.trim() : `HTTP ${res.status}`);
  }

  return data ?? {};
}

export const postJSON = (path, body, token) => req("POST", path, body, token);
export const getJSON  = (path, opts, token) => req("GET",  path, opts, token);
export const putJSON  = (path, body, token) => req("PUT",  path, body, token);
export const delJSON  = (path, opts, token) => req("DELETE", path, opts, token);

// ---------- AUTH HELPERS ----------

/** Customer signup */
export function registerUser({
  fullName,
  idNumber,
  accountNumber,
  email,
  username,
  password,
  recaptchaToken,   // <-- add this
}) {
  return postJSON("/api/auth/register", {
    fullName,
    idNumber,
    accountNumber,
    email,
    username,
    password,
    recaptchaToken,  // <-- send to backend
  });
}

/** Customer login: username + password (+ optional accountNumber) */
export function loginUser({ username, password, accountNumber }) {
  return postJSON("/api/auth/login", {
    username,
    password,
    ...(accountNumber ? { accountNumber } : {}),
  });
}

/** Employee/Admin login: username + password only */
//export function loginStaff({ username, password }) {
  //return postJSON("/api/auth/staff/login", { username, password });
//}
export function loginStaff({ username, password, captchaToken }) {
    return postJSON("/api/auth/staff/login", { username, password, captchaToken });
}
/** Who am I (based on bearer token) */
export function me() {
  return getJSON("/api/auth/me");
}

export function refreshToken() {
  return postJSON("/api/auth/refresh", {});
}

export function logout() {
  return postJSON("/api/auth/logout", {});
}

// ---------- CUSTOMER PAYMENTS (for your end-to-end test) ----------

/** Create a payment (customer perspective) */
export function createPayment({ amount, currency, provider, beneficiarySwift, payeeAccount }) {
  return postJSON("/api/payments", {
    amount,
    currency,
    provider,
    beneficiarySwift,
    payeeAccount,
  });
}

/** List my payments (customer) */
export function listMyPayments({ q, status, page = 1, pageSize = 20 } = {}) {
  return getJSON("/api/payments", { params: { q, status, page, pageSize } });
}

/** Get one payment (customer) */
export function getMyPayment(id) {
  return getJSON(`/api/payments/${id}`);
}

const api = {
  // base request helpers
  get: (path, opts) => getJSON(path, opts),
  post: (path, body) => postJSON(path, body),
  put: (path, body) => putJSON(path, body),
  delete: (path, opts) => delJSON(path, opts),
  base: API_BASE,

  // auth
  registerUser,
  loginUser,
  loginStaff,
  me,
  refreshToken,
  logout,

  // customer payments
  createPayment,
  listMyPayments,
  getMyPayment,
};

export default api;
