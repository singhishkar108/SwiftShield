// backend/src/models/Payment.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Payment lifecycle (Task 3):
 * created -> pending | pending_auth -> verified -> sent | failed
 *
 * Customer-side (you already have):
 *   startAuthWindow() -> isAuthPending() -> approve()/expireAuth()
 *
 * Staff-side additions (Task 3):
 *   verify(actorId, note?) -> moves to 'verified' and records audit
 *   submitToSwift(actorId, note?) -> moves to 'sent' and records audit
 *
 * We preserve all existing behavior and statuses, only adding 'verified' + audit.
 */

const AuthSchema = new Schema(
  {
    token: { type: String, default: null },       // random hex (owner's browser gets it)
    expiresAt: { type: Date, default: null },     // T+59s
  },
  { _id: false }
);

const AuditEntrySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, enum: ["created", "pending_auth", "verified", "submit_swift", "failed", "note"] },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // monetary details
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    provider: { type: String, required: true, default: "SWIFT" },

    // beneficiary (PII encrypted at rest)
    beneficiaryName: { type: String, required: true },
    beneficiaryAccountEnc: { type: String, required: true, select: false }, // hidden by default
    beneficiarySwift: { type: String, required: true },

    // optional link when user chose "save beneficiary"
    savedAsBeneficiaryId: { type: Schema.Types.ObjectId, ref: "Beneficiary", default: null },

    // lifecycle state
    status: {
      type: String,
      // ⬇️ added 'verified' state for staff workflow
      enum: ["created","pending_auth","sent","verified","completed"],
      default: "created",
      index: true,
    },

    // short-lived auth window (customer-side)
    auth: { type: AuthSchema, default: () => ({}) },

    // staff workflow & completion
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    submittedAt: { type: Date, default: null },

    // completion + POP
    completedAt: { type: Date, default: null, index: true }, // kept for backwards compat
    popRef: { type: String, default: null },

    // audit trail
    audit: { type: [AuditEntrySchema], default: [] },

    // misc
    meta: { type: Object, default: {} },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    strict: true,
  }
);

// Helpful indexes
PaymentSchema.index({ owner: 1, createdAt: -1 });
// DO NOT TTL-delete payments automatically; keep full audit history.

// -------- Instance helpers (customer-side, unchanged) --------
PaymentSchema.methods.startAuthWindow = function startAuthWindow(token, seconds = 59) {
  this.status = "pending_auth";
  this.auth = {
    token,
    expiresAt: new Date(Date.now() + seconds * 1000),
  };
  this.audit.push({ action: "pending_auth" });
};

PaymentSchema.methods.isAuthPending = function isAuthPending() {
  return (
    this.status === "pending_auth" &&
    this.auth?.token &&
    this.auth?.expiresAt &&
    this.auth.expiresAt > new Date()
  );
};

PaymentSchema.methods.expireAuth = function expireAuth() {
  if (this.status === "pending_auth") {
    this.auth.token = null;
    this.auth.expiresAt = null;
    this.status = "failed";
    this.audit.push({ action: "failed", note: "auth expired" });
  }
};

/**
 * ⚠️ Existing approve() moved to an alias for submitToSwift without staff step.
 * If your existing flows still call approve() from customer-side auth, we keep it:
 * it sets status=sent and timestamps. For the new staff flow we prefer verify+submitToSwift.
 */
PaymentSchema.methods.approve = function approve() {
  this.status = "sent";
  this.completedAt = new Date();
  this.submittedAt = this.completedAt; // keep new field in sync
  this.auth.token = null;
  this.auth.expiresAt = null;
  this.audit.push({ action: "submit_swift", note: "auto-approve legacy path" });
};

// -------- New instance helpers (staff-side) --------
PaymentSchema.methods.verify = function verify(actorId, note = "") {
  if (!["created", "pending", "pending_auth"].includes(this.status)) {
    throw new Error("Cannot verify in current state");
  }
  this.status = "verified";
  this.verifiedBy = actorId;
  this.verifiedAt = new Date();
  this.audit.push({ actorId, action: "verified", note });
};

PaymentSchema.methods.submitToSwift = function submitToSwift(actorId, note = "") {
  if (this.status !== "verified") {
    throw new Error("Payment must be verified first");
  }
  this.status = "sent";
  this.submittedBy = actorId;
  this.submittedAt = new Date();
  this.completedAt = this.submittedAt; // keep backwards compat
  // ensure any old one-time token is cleared
  if (this.auth) {
    this.auth.token = null;
    this.auth.expiresAt = null;
  }
  this.audit.push({ actorId, action: "submit_swift", note });
};

export const Payment = mongoose.model("Payment", PaymentSchema);
