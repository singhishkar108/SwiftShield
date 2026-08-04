//backend/src/models/PasswordReset.js
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  tokenHash: { type: String, index: true, unique: true, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const PasswordReset = mongoose.model("PasswordReset", schema);
