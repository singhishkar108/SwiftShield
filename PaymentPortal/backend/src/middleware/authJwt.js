// backend/src/middleware/authJwt.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function authJwt(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return next(); // let routes decide (public vs protected)
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) return next();

    // attach what roles.js expects
    req.user = {
      _id: user._id,
      username: user.username,
      role: user.role,
      isDisabled: !!user.isDisabled,
      approvalPinHash: user.approvalPinHash || null,
      sessionVersion: user.sessionVersion || 0,
      passwordUpdatedAt: user.passwordUpdatedAt || null,
    };
    return next();
  } catch {
    // invalid token → continue without user; protected routes will block
    return next();
  }
}

export default authJwt;
