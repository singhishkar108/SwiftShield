import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    // registration fields per brief
    fullName: { type: String, required: true, trim: true },
    idNumber: { type: String, required: true }, // SA ID (13 digits)

    // Encrypted at rest (supports legacy {iv,ct,tag} or new base64 blob)
    accountNumberEnc: { type: Schema.Types.Mixed, required: true },

    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
     role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer', index: true },
    approvalPinHash: { type: String, default: null },    // 4–8 digits, hashed+salted just like password
      isDisabled: { type: Boolean, default: false },
    // helpful extras
    passwordUpdatedAt: { type: Date, default: Date.now },   // used to invalidate older JWTs
    sessionVersion: { type: Number, default: 0 },           // bump to kill all sessions
    passwordHistory: { type: [String], default: [] },       // optional: prevent reuse

    failedLogins: { type: Number, default: 0 },
    lastLoginAt: { type: Date },

    email: { type: String, lowercase: true, trim: true, index: true, default: null },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// helpful indexes
//UserSchema.index({ username: 1 }, { unique: true });

export const User = mongoose.model("User", UserSchema);
