import { Router } from "express";
import { requireAuth } from "./auth.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req, res) => {
  // req.auth was set by requireAuth (from the JWT)
  res.json({ ok: true, sub: req.auth.sub, username: req.auth.u });
});
