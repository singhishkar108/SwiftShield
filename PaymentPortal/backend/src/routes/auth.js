// backend/src/routes/auth.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

import { User } from "../models/User.js";
import { PasswordReset } from "../models/PasswordReset.js";

import { encrypt } from "../utils/crypto.js";
import { sendMail } from "../utils/mailer.js";

import {
  validatePassword,
  hashPassword,
  verifyPassword
} from "../auth/policy.js";

import {
  reFullName,
  reSAIdNumber,
  reAccountNumber,
  reUsername,
  reEmail
} from "../validation/fields.js";

import { requireRecaptcha } from "../middleware/recaptcha.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// cookie options (HTTPS-only in real life; allow http in dev if needed)
const isProd = process.env.NODE_ENV === "production";
const REFRESH_COOKIE_NAME = "refresh";
const REFRESH_PATH = "/api/auth/refresh";

const router = Router();

/* ---------------- Abuse protection ---------------- */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(authLimiter);

/* ---------------- JWT helpers ---------------- */
function issueAccessToken(user) {
  // embed password timestamp + session version to allow server-side invalidation
  const pv = new Date(user.passwordUpdatedAt || 0).getTime();
  const sv = Number(user.sessionVersion || 0);

  // include minimal claims only (no PII)
  return jwt.sign({ sub: user.id, u: user.username, pv, sv }, JWT_SECRET, { expiresIn: "15m" });
}

function issueRefreshToken(user) {
  // long-lived token for re-issuing short-lived access tokens
  // (also include pv/sv so server-side invalidation works if password changes)
  const pv = new Date(user.passwordUpdatedAt || 0).getTime();
  const sv = Number(user.sessionVersion || 0);
  return jwt.sign({ sub: user.id, u: user.username, pv, sv, type: "refresh" }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd || !!process.env.HTTPS_PORT, // true when served over HTTPS
    sameSite: "lax",
    path: REFRESH_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd || !!process.env.HTTPS_PORT,
    sameSite: "lax",
    path: REFRESH_PATH,
  });
}

/* ---------------- Auth middleware (version-aware) ---------------- */
export async function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing token" });

    const payload = jwt.verify(token, JWT_SECRET); // { sub, u, pv, sv, iat, exp }

    // check server-side versions to invalidate old tokens
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "invalid/expired token" });

    const pv = new Date(user.passwordUpdatedAt || 0).getTime();
    const sv = Number(user.sessionVersion || 0);
    if (payload.pv !== pv || payload.sv !== sv) {
      return res.status(401).json({ error: "token invalidated" });
    }

    req.auth = payload; // OK
    next();
  } catch {
    return res.status(401).json({ error: "invalid/expired token" });
  }
}

/* ---------------- Register ---------------- */
// Body: { fullName, idNumber, accountNumber, username, password, email }
router.post("/register", requireRecaptcha, async (req, res) => {
  try {
    const { fullName, idNumber, accountNumber, username, password, email } = req.body || {};

    // whitelist validation
    const errors = [];
    if (!reFullName.test(fullName || "")) errors.push("fullName invalid");
    if (!reSAIdNumber.test(idNumber || "")) errors.push("idNumber invalid");
    if (!reAccountNumber.test(accountNumber || "")) errors.push("accountNumber invalid");
    if (!reUsername.test(username || "")) errors.push("username invalid");
    if (!reEmail.test(email || "")) errors.push("email invalid");

    const pwv = validatePassword(password || "", { username, name: fullName });
    if (!pwv.ok) errors.push(...pwv.errors.map((e) => `password ${e}`));
    if (errors.length) return res.status(400).json({ errors });

    // uniqueness
    const exists = await User.findOne({ username }).lean();
    if (exists) return res.status(409).json({ error: "username already exists" });

    // hash pw + encrypt account number
    const passwordHash = await hashPassword(password);
    const accountNumberEnc = encrypt(accountNumber);

    const user = await User.create({
      fullName,
      idNumber,
      accountNumberEnc,
      username,
      passwordHash,
      email,
      passwordUpdatedAt: new Date(),
      sessionVersion: 0,
      failedLogins: 0,
    });

    const access = issueAccessToken(user);
    const refresh = issueRefreshToken(user);
    setRefreshCookie(res, refresh);

    return res
      .status(201)
      .json({ ok: true, token: access, username: user.username, fullName: user.fullName });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

/* ---------------- Login ---------------- */
// Body: { username, accountNumber, password }
router.post("/login", requireRecaptcha, async (req, res) => {
  try {
    const { username, accountNumber, password } = req.body || {};
    if (!reUsername.test(username || "")) return res.status(400).json({ error: "invalid username" });
    if (!reAccountNumber.test(accountNumber || "")) return res.status(400).json({ error: "invalid accountNumber" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    // verify password
    const okPw = await verifyPassword(password || "", user.passwordHash);
    if (!okPw) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } });
      return res.status(401).json({ error: "invalid credentials" });
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { failedLogins: 0, lastLoginAt: new Date() } }
    );

    const access = issueAccessToken(user); // rotated on every login
    const refresh = issueRefreshToken(user);
    setRefreshCookie(res, refresh);

    return res.json({ ok: true, token: access, username: user.username, fullName: user.fullName });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

/* ---------------- Refresh (rotate access token) ---------------- */
router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "missing refresh token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET); // { sub, u, pv, sv, type, ... }
    if (payload.type !== "refresh") return res.status(401).json({ error: "invalid token" });

    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "invalid token" });

    // validate pv/sv still match (server-side invalidation)
    const pv = new Date(user.passwordUpdatedAt || 0).getTime();
    const sv = Number(user.sessionVersion || 0);
    if (payload.pv !== pv || payload.sv !== sv) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "token invalidated" });
    }

    // optional: rotate refresh token (sliding sessions)
    const newRefresh = issueRefreshToken(user);
    setRefreshCookie(res, newRefresh);

    const newAccess = issueAccessToken(user);
    return res.json({ ok: true, token: newAccess });
  } catch (e) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "invalid/expired refresh token" });
  }
});

/* ---------------- Change Password ---------------- */
// Body: { currentPassword, newPassword }
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ error: "invalid body" });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    // verify current password
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid current password" });

    // strong policy (server is SoT)
    const pv = validatePassword(newPassword, { username: user.username, name: user.fullName });
    if (!pv.ok) return res.status(400).json({ errors: pv.errors.map((e) => `password ${e}`) });

    // update hash + invalidate every existing token
    user.passwordHash = await hashPassword(newPassword);
    user.passwordUpdatedAt = new Date();
    user.sessionVersion = (user.sessionVersion || 0) + 1; // kill all existing sessions
    await user.save();

    // clear old refresh + set new one; return fresh access token
    clearRefreshCookie(res);
    const access = issueAccessToken(user);
    const refresh = issueRefreshToken(user);
    setRefreshCookie(res, refresh);

    return res.json({ ok: true, token: access, username: user.username, fullName: user.fullName });
  } catch (e) {
    console.error("change-password error", e);
    return res.status(500).json({ error: "server error" });
  }
});

/* ---------------- Forgot password (request link) ---------------- */
// Body: { username }
router.post("/forgot-password", async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!reUsername.test(username || "")) return res.status(200).json({ ok: true }); // avoid enumeration

    const user = await User.findOne({ username }).lean();
    // Always return 200 to avoid user enumeration if user/email not present.
    if (!user || !user.email) return res.json({ ok: true });

    // Create a random token; store only its hash (single use, short TTL)
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate previous outstanding tokens for this user
    await PasswordReset.deleteMany({ userId: user._id, usedAt: null });

    await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });

    const link = `${APP_URL}/reset-password?token=${raw}`;
    await sendMail({
      to: user.email,
      subject: "Password reset",
      text: `To reset your password, open: ${link} (valid 15 minutes)`,
      html: `<p>To reset your password, click:</p><p><a href="${link}">${link}</a></p><p>Valid for 15 minutes.</p>`
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("forgot-password error", e);
    // Still return 200 to avoid enumeration
    return res.status(200).json({ ok: true });
  }
});

/* ---------------- Reset password (consume token) ---------------- */
// Body: { token, newPassword }
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== "string") return res.status(400).json({ error: "invalid token" });

    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
    const pr = await PasswordReset.findOne({ tokenHash }).lean();
    if (!pr || pr.usedAt || pr.expiresAt < new Date()) {
      return res.status(400).json({ error: "token invalid/expired" });
    }

    const user = await User.findById(pr.userId);
    if (!user) return res.status(400).json({ error: "token invalid/expired" });

    // strong policy
    const pv = validatePassword(newPassword, { username: user.username, name: user.fullName });
    if (!pv.ok) return res.status(400).json({ errors: pv.errors.map(e => `password ${e}`) });

    // update hash + invalidate all existing tokens
    user.passwordHash = await hashPassword(newPassword);
    user.passwordUpdatedAt = new Date();
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();

    // mark token used (single-use)
    await PasswordReset.updateOne({ _id: pr._id }, { $set: { usedAt: new Date() } });

    // clear any old refresh cookie then issue a fresh pair
    clearRefreshCookie(res);
    const access = issueAccessToken(user);
    const refresh = issueRefreshToken(user);
    setRefreshCookie(res, refresh);

    return res.json({ ok: true, token: access, username: user.username, fullName: user.fullName });
  } catch (e) {
    console.error("reset-password error", e);
    return res.status(500).json({ error: "server error" });
  }
});

/* ---------------- Logout ---------------- */
router.post("/logout", (_req, res) => {
  clearRefreshCookie(res);
  return res.json({ ok: true });
});
// in backend/src/routes/auth.js
//router.post("/staff/login", async (req, res) => {
router.post("/staff/login", requireRecaptcha, async (req, res) => {

  try {
    const { username, password } = req.body || {};
    if (!reUsername.test(username || "")) return res.status(400).json({ error: "invalid username" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    if (!["staff","admin"].includes(user.role)) return res.status(403).json({ error: "not staff" });

    const okPw = await verifyPassword(password || "", user.passwordHash);
    if (!okPw) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } });
      return res.status(401).json({ error: "invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const access = issueAccessToken(user);
    const refresh = issueRefreshToken(user);
    setRefreshCookie(res, refresh);
    return res.json({ ok: true, token: access, username: user.username, fullName: user.fullName, role: user.role });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
// in backend/src/routes/auth.js
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.sub).select("username fullName role").lean();
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ ok: true, user });
});


export const authRouter = router;