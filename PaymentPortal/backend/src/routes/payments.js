// backend/src/routes/payments.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import crypto from "crypto";
import PDFDocument from "pdfkit";

import { requireAuth } from "./auth.js"; // adjust path if needed
import { requireRecaptcha } from "../middleware/recaptcha.js";
import { Beneficiary } from "../models/Beneficiary.js";
import { Payment } from "../models/Payment.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { reSwift, reAmount, currencyAllow } from "../validation/fields.js";

// NEW: mail + POP helpers
import { sendMail } from "../utils/mailer.js";
import { buildPopPdfBuffer } from "../utils/pop.js";

const router = Router();

/* ---------------------------------------------
 * Rate limit for payments to mitigate abuse
 * ------------------------------------------- */
const paymentsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(paymentsLimiter);

/* ---------------------------------------------
 * zod schema for POST /payments
 * ------------------------------------------- */
const PaymentSchema = z.object({
  amount: z.string().regex(reAmount).transform((s) => parseFloat(s)),
  currency: z.string().refine((c) => currencyAllow.has(c), { message: "unsupported currency" }),
  provider: z.string().default("SWIFT"),
  beneficiaryName: z.string().min(1).max(140),
  beneficiaryAccount: z.string().regex(/^\d{8,20}$/, "account number invalid"),
  beneficiarySwift: z.string().regex(reSwift, "invalid SWIFT/BIC"),
  saveBeneficiary: z.boolean().optional(),
  captchaToken: z.string().min(10),
});

/* ---------------------------------------------
 * POST /payments  (create + start 59s auth window)
 * ------------------------------------------- */
router.post("/", requireAuth, requireRecaptcha, async (req, res) => {
  try {
    const parsed = PaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn("Payment validation failed", parsed.error.format());
      return res.status(400).json({ error: "validation failed", details: parsed.error.errors });
    }
    const data = parsed.data;

    const MAX_TXN = 1_000_000;
    if (data.amount > MAX_TXN) {
      return res.status(400).json({ error: "amount exceeds allowed maximum" });
    }

    const beneficiaryAccountEnc = encrypt(data.beneficiaryAccount);

    // optional: save beneficiary
    let savedBeneficiaryId = null;
    if (data.saveBeneficiary) {
      const b = await Beneficiary.create({
        owner: req.auth.sub,
        name: data.beneficiaryName,
        accountNumberEnc: beneficiaryAccountEnc,
        swift: data.beneficiarySwift.toUpperCase(),
        provider: data.provider,
      });
      savedBeneficiaryId = b._id;
    }

    // create payment
    const token = crypto.randomBytes(16).toString("hex"); // 32 hex chars
    const expiresAt = new Date(Date.now() + 59 * 1000);

    const payment = new Payment({
      owner: req.auth.sub,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      beneficiaryName: data.beneficiaryName,
      beneficiaryAccountEnc,
      beneficiarySwift: data.beneficiarySwift.toUpperCase(),
      savedAsBeneficiaryId: savedBeneficiaryId,
      status: "created",
      meta: { initiatedBy: req.auth.u },
    });

    // start 59s auth window
    if (typeof payment.startAuthWindow === "function") {
      payment.startAuthWindow(token, 59);
    } else {
      payment.status = "pending_auth";
      payment.auth = { token, expiresAt };
    }

    await payment.save();

    console.log("AUDIT: payment created", {
      paymentId: payment._id,
      user: req.auth.u,
      amount: data.amount,
      currency: data.currency,
    });

    return res.status(201).json({
      ok: true,
      paymentId: payment._id,
      auth: { token, expiresAt: payment.auth.expiresAt },
    });
  } catch (e) {
    console.error("payments create error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

/* ---------------------------------------------
 * GET /payments  (list)
 * ------------------------------------------- */
router.get("/", requireAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ owner: req.auth.sub })
      .select("+beneficiaryAccountEnc")
      .sort({ createdAt: -1 })
      .lean();

    const out = payments.map((p) => ({
      id: p._id,
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      beneficiaryName: p.beneficiaryName,
      beneficiaryAccount: decrypt(p.beneficiaryAccountEnc),
      beneficiarySwift: p.beneficiarySwift,
      status: p.status,
      createdAt: p.createdAt,
      completedAt: p.completedAt || null,
      popRef: p.popRef || null,
    }));
    return res.json({ ok: true, payments: out });
  } catch (e) {
    console.error("payments list error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

/* ---------------------------------------------
 * Beneficiaries: create/list/delete
 * ------------------------------------------- */
router.post("/beneficiaries", requireAuth, async (req, res) => {
  try {
    const { name, accountNumber, swift } = req.body || {};
    if (!name || !/^\d{8,20}$/.test(accountNumber) || !reSwift.test(String(swift).toUpperCase())) {
      return res.status(400).json({ error: "invalid beneficiary" });
    }
    const enc = encrypt(accountNumber);
    const b = await Beneficiary.create({
      owner: req.auth.sub,
      name,
      accountNumberEnc: enc,
      swift: String(swift).toUpperCase(),
    });
    return res.status(201).json({ ok: true, beneficiaryId: b._id });
  } catch (e) {
    console.error("beneficiary create error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

router.get("/beneficiaries", requireAuth, async (req, res) => {
  try {
    const bs = await Beneficiary.find({ owner: req.auth.sub }).sort({ createdAt: -1 }).lean();
    const out = bs.map((b) => ({
      id: b._id,
      name: b.name,
      accountNumber: decrypt(b.accountNumberEnc),
      swift: b.swift,
      createdAt: b.createdAt,
    }));
    return res.json({ ok: true, beneficiaries: out });
  } catch (e) {
    console.error("beneficiaries list error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

router.delete("/beneficiaries/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Beneficiary.findOneAndDelete({ _id: id, owner: req.auth.sub });
    if (!doc) return res.status(404).json({ error: "not found" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("beneficiary delete error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

/* ---------------------------------------------
 * 59s Auth flow: status + approve
 * ------------------------------------------- */

// GET /payments/:id/auth  -> remaining seconds + token
router.get("/:id/auth", requireAuth, async (req, res) => {
  try {
    console.log("[staff:getOne]", id, typeof id);

    const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub });
    if (!p) return res.status(404).json({ error: "not found" });

    const pending =
      p.status === "pending_auth" && p.auth?.expiresAt && p.auth.expiresAt > new Date();

    const remainingSeconds = pending
      ? Math.max(0, Math.floor((p.auth.expiresAt.getTime() - Date.now()) / 1000))
      : 0;

    return res.json({
      ok: true,
      status: pending ? "pending" : "expired",
      remainingSeconds,
      token: pending ? p.auth.token : null,
    });
  } catch (e) {
    console.error("auth status error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

// POST /payments/:id/approve  { token }
router.post("/:id/approve", requireAuth, async (req, res) => {
  try {
    const { token } = req.body || {};
    const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub });
    if (!p) return res.status(404).json({ error: "not found" });

    const pending =
      p.status === "pending_auth" && p.auth?.expiresAt && p.auth.expiresAt > new Date();

    const validToken =
      pending &&
      token &&
      p.auth?.token &&
      crypto.timingSafeEqual(Buffer.from(p.auth.token), Buffer.from(token));

    if (!validToken) {
      if (p.status === "pending_auth") {
        p.status = "failed";
        p.auth = { token: null, expiresAt: null };
        await p.save();
      }
      return res.status(400).json({ error: "auth expired or invalid" });
    }

    // simulate SWIFT success
    p.status = "sent";
    p.completedAt = new Date();
    p.popRef = crypto.randomBytes(6).toString("hex").toUpperCase();
    p.auth = { token: null, expiresAt: null };
    await p.save();

    console.log("AUDIT: payment approved", { paymentId: p._id, user: req.auth.u });
    return res.json({ ok: true, paymentId: p._id });
  } catch (e) {
    console.error("approve error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

/* ---------------------------------------------
 * Summary & POP
 * ------------------------------------------- */

// GET /payments/:id/summary
router.get("/:id/summary", requireAuth, async (req, res) => {
  try {
    const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub })
      .select("+beneficiaryAccountEnc")
      .lean();

    if (!p) return res.status(404).json({ error: "not found" });

    return res.json({
      ok: true,
      summary: {
        id: p._id,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        provider: p.provider,
        beneficiaryName: p.beneficiaryName,
        beneficiaryAccount: decrypt(p.beneficiaryAccountEnc),
        beneficiarySwift: p.beneficiarySwift,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
        popRef: p.popRef,
      },
    });
  } catch (e) {
    console.error("summary error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

// GET /payments/:id/pop.pdf
router.get("/:id/pop.pdf", requireAuth, async (req, res) => {
  try {
    const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub })
      .select("+beneficiaryAccountEnc")
      .lean();

    if (!p || p.status !== "sent") return res.status(404).end();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="POP-${p._id}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    doc.fontSize(18).text("Proof of Payment", { align: "center" }).moveDown();
    doc.fontSize(12)
      .text(`Reference: ${p.popRef || p._id}`)
      .text(`Date: ${new Date(p.completedAt || Date.now()).toLocaleString()}`)
      .moveDown()
      .text(`Amount: ${Number(p.amount).toFixed(2)} ${p.currency}`)
      .text(`Provider: ${p.provider}`)
      .moveDown()
      .text("Beneficiary:")
      .text(`  ${p.beneficiaryName}`)
      .text(`  Account: ${decrypt(p.beneficiaryAccountEnc)}`)
      .text(`  SWIFT/BIC: ${p.beneficiarySwift}`);

    doc.end();
  } catch (e) {
    console.error("pop pdf error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

/* ---------------------------------------------
 * Email POP
 * ------------------------------------------- */

const EmailSchema = z.object({ to: z.string().email() });

// POST /payments/:id/email-pop  { to }
router.post("/:id/email-pop", requireAuth, async (req, res) => {
  try {
    const parsed = EmailSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "invalid email" });

    const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub })
      .select("+beneficiaryAccountEnc")
      .lean();
    if (!p) return res.status(404).json({ error: "not found" });
    if (p.status !== "sent") return res.status(400).json({ error: "payment not completed" });

    const pdf = await buildPopPdfBuffer(p);

    await sendMail({
      to: parsed.data.to,
      subject: `Proof of Payment • ${p.popRef || p._id}`,
      text: `Please find attached the proof of payment for ${p.amount} ${p.currency}.`,
      html: `<p>Please find attached the proof of payment for <b>${p.amount} ${p.currency}</b>.</p>
             <p>Reference: <b>${p.popRef || p._id}</b></p>`,
      attachments: [{ filename: `POP-${p.popRef || p._id}.pdf`, content: pdf }],
    });

    console.log("AUDIT: POP emailed", { paymentId: p._id, to: parsed.data.to, user: req.auth.u });
    return res.json({ ok: true });
  } catch (e) {
    console.error("email-pop error", e);
    return res.status(500).json({ error: e.message || "server error" });
  }
});

/* ---------------------------------------------
 * Optional aliases (keep UI flexible)
 * ------------------------------------------- */

// POST /payments/:id/initiate-auth  -> alias of GET /:id/auth
router.post("/:id/initiate-auth", requireAuth, async (req, res) => {
  const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub });
  if (!p) return res.status(404).json({ error: "not found" });
  const pending = p.status === "pending_auth" && p.auth?.expiresAt && p.auth.expiresAt > new Date();
  const remainingSeconds = pending
    ? Math.max(0, Math.floor((p.auth.expiresAt.getTime() - Date.now()) / 1000))
    : 0;
  return res.json({
    ok: true,
    status: pending ? "pending" : "expired",
    authToken: pending ? p.auth.token : null,
    remainingSeconds,
  });
});

// POST /payments/:id/confirm-auth  -> alias of POST /:id/approve
router.post("/:id/confirm-auth", requireAuth, async (req, res) => {
  req.body = { token: req.body?.authToken }; // normalize shape
  // Re-run the same logic as /:id/approve
  const { token } = req.body || {};
  const p = await Payment.findOne({ _id: req.params.id, owner: req.auth.sub });
  if (!p) return res.status(404).json({ error: "not found" });

  const pending =
    p.status === "pending_auth" && p.auth?.expiresAt && p.auth.expiresAt > new Date();

  const validToken =
    pending && token && p.auth?.token &&
    crypto.timingSafeEqual(Buffer.from(p.auth.token), Buffer.from(token));

  if (!validToken) {
    if (p.status === "pending_auth") {
      p.status = "failed";
      p.auth = { token: null, expiresAt: null };
      await p.save();
    }
    return res.status(400).json({ error: "auth expired or invalid" });
  }

  p.status = "sent";
  p.completedAt = new Date();
  p.popRef = crypto.randomBytes(6).toString("hex").toUpperCase();
  p.auth = { token: null, expiresAt: null };
  await p.save();

  return res.json({ ok: true, paymentId: p._id });
});

export const paymentsRouter = router;
