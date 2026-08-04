// Uses Argon2id hashing with a server-side PEPPER (PWD_PEPPER) in addition to Argon2's random salt.
// Enforces a strong password policy on the server.
// Verifies passwords using the same PEPPER; salts are embedded in the Argon2 hash.

import argon2 from "argon2";

// Server-side secret added to every password before hashing.
const PEPPER = process.env.PWD_PEPPER || "";

// Regular expressions for password complexity checks.
const reUpper = /[A-Z]/;
const reLower = /[a-z]/;
const reDigit = /\d/;
const reSymbol = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/;

// Validate a password against the application's security policy.
export function validatePassword(pw, userCtx = {}) {
  if (typeof pw !== "string") return { ok: false, errors: ["invalid type"] };

  // Normalize Unicode characters for consistent validation.
  const p = pw.normalize("NFC");
  const errors = [];

  // Enforce minimum complexity requirements.
  if (p.length < 12) errors.push("must be at least 12 characters");
  if (!reUpper.test(p)) errors.push("must include an uppercase letter");
  if (!reLower.test(p)) errors.push("must include a lowercase letter");
  if (!reDigit.test(p)) errors.push("must include a digit");
  if (!reSymbol.test(p)) errors.push("must include a symbol");

  const lower = p.toLowerCase();

  // Reject commonly used or easily guessed passwords.
  const bads = ["password", "qwerty", "letmein", "welcome", "admin", "123456", "111111"];
  if (bads.some((b) => lower.includes(b))) errors.push("too common/guessable");

  // Prevent repeated characters and simple numeric sequences.
  if (/(.)\1\1/.test(p)) errors.push("contains three or more repeated characters");
  if (/(?:0123|1234|2345|3456|4567|5678|6789)/.test(p)) errors.push("contains numeric sequences");

  // Prevent passwords containing personal information.
  const parts = [userCtx?.email, userCtx?.name, userCtx?.username].filter(Boolean).flatMap((s) =>
    String(s)
      .toLowerCase()
      .split(/[@._\s-]+/),
  );

  if (parts.some((x) => x.length >= 3 && lower.includes(x))) {
    errors.push("contains personal info");
  }

  return { ok: errors.length === 0, errors };
}

// Hash a password using Argon2id with the server-side PEPPER.
export async function hashPassword(pw) {
  return argon2.hash(pw + PEPPER, {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MB memory usage.
    timeCost: 2, // Number of hashing iterations.
    parallelism: 1, // Single-threaded hashing.
  });
}

// Verify a password against its stored Argon2id hash.
export async function verifyPassword(pw, hash) {
  return argon2.verify(hash, pw + PEPPER);
}
