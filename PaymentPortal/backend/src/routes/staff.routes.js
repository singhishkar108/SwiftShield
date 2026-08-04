// backend/src/routes/staff.routes.js
import express from "express";
import { requireStaff } from "../middleware/roles.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { verifyPassword } from "../auth/policy.js";
import { reObjectId, reStatus, rePage, rePageSize, reNote } from "../validation/whitelists.js";

const r = express.Router();

// Staff-only for everything here
r.use(requireStaff);

/* ------------------------------- helpers -------------------------------- */

function shapePayment(p) {
  const last4 =
    p?.meta?.accountLast4 ||
    (typeof p?.meta?.maskedAccount === "string" ? p.meta.maskedAccount : "••••");
  return {
    _id: p._id,
    amount: p.amount,
    currency: p.currency,
    provider: p.provider,
    beneficiarySwift: p.beneficiarySwift,
    maskedAccount: typeof last4 === "string" ? last4 : "••••",
    status: p.status,                     // "sent" | "verified" | "completed" | (legacy: created/pending_auth)
    owner: p.owner
      ? { _id: p.owner._id, username: p.owner.username, fullName: p.owner.fullName }
      : null,
    audit: p.audit || [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function getActorWithPin(userFromReq) {
  if (userFromReq?.approvalPinHash) return userFromReq;
  const me = await User.findById(userFromReq?._id).select("+approvalPinHash role username").lean();
  return me || null;
}

/* ------------------------------ list/search ------------------------------ */

r.get("/payments", async (req, res) => {
  const { status = "", q = "", page = "1", pageSize = "20" } = req.query;

  if (status && !reStatus.test(status)) return res.status(400).json({ ok: false, msg: "bad status" });
  if (!rePage.test(page) || !rePageSize.test(pageSize)) return res.status(400).json({ ok: false, msg: "bad paging" });

  const match = {};
  if (status) match.status = status;

  const safeQ = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const skip = (+page - 1) * (+pageSize);

  const pipeline = [{ $match: match }];
  if (safeQ) pipeline.push({ $match: { $or: [{ beneficiarySwift: safeQ }] } });

  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: +pageSize },
    { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "owner" } },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } }
  );

  if (safeQ) pipeline.push({ $match: { $or: [{ beneficiarySwift: safeQ }, { "owner.username": safeQ }] } });

  const [rows, total] = await Promise.all([
    Payment.aggregate(pipeline),
    Payment.countDocuments(match),
  ]);

  res.json({ ok: true, items: rows.map(shapePayment), total });
});

/* --------------------------------- get ----------------------------------- */

r.get("/payments/:id", async (req, res) => {
  const { id } = req.params;
  if (!reObjectId.test(id)) return res.status(400).json({ ok: false, msg: "bad id" });
  console.log("[staff:getOne]", id, typeof id);

  const p = await Payment.findById(id).populate({ path: "owner", select: "username fullName" });
  if (!p) return res.status(404).json({ ok: false, msg: "not found" });
  res.json({ ok: true, item: shapePayment(p) });
});

/* -------------------------------- verify --------------------------------- */
/**
 * POST /staff/payments/:id/verify  { approvalPin, note? }
 * Transition:
 *   created | pending_auth | sent  --->  verified
 * (If already verified/completed → 409)
 */
r.post("/payments/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    if (!reObjectId.test(id)) return res.status(400).json({ ok: false, msg: "bad id" });

    const me = await getActorWithPin(req.user);
    if (!me || !["staff", "admin"].includes(me.role)) return res.status(403).json({ ok: false, msg: "forbidden" });

    const approvalPin = String(req.body?.approvalPin ?? "").trim();
    if (!/^\d{4,6}$/.test(approvalPin)) return res.status(400).json({ ok: false, msg: "invalid pin format" });
    if (!me.approvalPinHash) return res.status(409).json({ ok: false, msg: "no approval pin set" });
    const pinOk = await verifyPassword(approvalPin, me.approvalPinHash);
    if (!pinOk) return res.status(401).json({ ok: false, msg: "invalid pin" });

    const note = (req.body?.note ?? "").trim();
    if (note && !reNote.test(note)) return res.status(400).json({ ok: false, msg: "bad note" });

    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ ok: false, msg: "not found" });

    if (p.status === "verified" || p.status === "completed") {
      return res.status(409).json({ ok: false, msg: "already verified or completed" });
    }

    // Allow verifying even if it arrived as 'sent'
    if (["created", "pending_auth", "sent"].includes(p.status)) {
      p.status = "verified";
      p.audit = p.audit || [];
      p.audit.push({ at: new Date(), action: "verified", by: me._id, note: note || "" });
      await p.save();
    } else {
      return res.status(409).json({ ok: false, msg: "cannot verify from current status" });
    }

    const shaped = await Payment.findById(p._id)
      .populate({ path: "owner", select: "username fullName" })
      .lean();

    return res.json({ ok: true, item: shapePayment(shaped) });
  } catch (e) {
    console.error("verify error:", e);
    return res.status(500).json({ ok: false, msg: "server error" });
  }
});

/* --------------------------- submit to SWIFT ------------------------------ */
/**
 * POST /staff/payments/:id/submit-swift  { approvalPin }
 * Allowed only when status === 'verified'
 * Transition:
 *    verified  --->  completed
 * (If already completed → idempotent return)
 */
r.post("/payments/:id/submit-swift", async (req, res) => {
  try {
    const { id } = req.params;
    if (!reObjectId.test(id)) return res.status(400).json({ ok: false, msg: "bad id" });

    const me = await getActorWithPin(req.user);
    if (!me || !["staff", "admin"].includes(me.role)) return res.status(403).json({ ok: false, msg: "forbidden" });

    const approvalPin = String(req.body?.approvalPin ?? "").trim();
    if (!/^\d{4,6}$/.test(approvalPin)) return res.status(400).json({ ok: false, msg: "invalid pin format" });
    if (!me.approvalPinHash) return res.status(409).json({ ok: false, msg: "no approval pin set" });
    const pinOk = await verifyPassword(approvalPin, me.approvalPinHash);
    if (!pinOk) return res.status(401).json({ ok: false, msg: "invalid pin" });

    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ ok: false, msg: "not found" });

    if (p.status === "completed") {
      // idempotent: already done
      const shapedAlready = await Payment.findById(p._id)
        .populate({ path: "owner", select: "username fullName" })
        .lean();
      return res.json({ ok: true, item: shapePayment(shapedAlready) });
    }

    if (p.status !== "verified") {
      return res.status(409).json({ ok: false, msg: "not verified" });
    }

    // Move to completed
    if (typeof p.submitToSwift === "function") {
      await p.submitToSwift(me._id, "");
      // Ensure domain method sets p.status = 'completed'; if not, enforce below:
      if (p.status !== "completed") {
        p.status = "completed";
        await p.save();
      }
    } else {
      p.status = "completed";
      p.audit = p.audit || [];
      p.audit.push({ at: new Date(), action: "submitted_to_swift", by: me._id, note: "" });
      await p.save();
    }

    const shaped = await Payment.findById(p._id)
      .populate({ path: "owner", select: "username fullName" })
      .lean();

    return res.json({ ok: true, item: shapePayment(shaped) });
  } catch (e) {
    console.error("submit-swift error:", e);
    return res.status(500).json({ ok: false, msg: "server error" });
  }
});

export default r;
