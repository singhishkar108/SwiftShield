//backend/src/models/Beneficiary.js
import mongoose from "mongoose";

const beneficiarySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who saved it
  name: { type: String, required: true }, //friendly name e.g., "My supplier - London"
  accountNumberEnc: { type: String, required: true }, // encrypted blob
  swift: { type: String, required: true }, //store normalized uppercase
  provider: { type: String, default: "SWIFT" },
  createdAt: { type: Date, default: Date.now },
});

export const Beneficiary = mongoose.model("Beneficiary", beneficiarySchema);
