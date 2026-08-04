// mirror of your server regex + allow-list
export const reFullName = /^[A-Za-z' -]{2,80}$/;
export const reSAIdNumber = /^\d{13}$/;
export const reAccountNumber = /^\d{8,16}$/;
export const reUsername = /^[a-zA-Z0-9._-]{3,30}$/;
export const reAmount = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
export const reSwift = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const currencyAllow = new Set(["ZAR", "USD", "EUR", "GBP"]);

export function validatePasswordClient(pw, { username, name } = {}) {
  const errors = [];
  if (!pw || typeof pw !== "string") return ["password required"];
  const p = pw.normalize("NFC");
  if (p.length < 12) errors.push("min 12 chars");
  if (!/[A-Z]/.test(p)) errors.push("add an uppercase letter");
  if (!/[a-z]/.test(p)) errors.push("add a lowercase letter");
  if (!/\d/.test(p)) errors.push("add a digit");
  if (!/[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(p)) errors.push("add a symbol");
  const lower = p.toLowerCase();
  const bads = ["password", "qwerty", "letmein", "welcome", "admin", "123456", "111111"];
  if (bads.some((b) => lower.includes(b))) errors.push("too common");
  if (/(.)\1\1/.test(p)) errors.push("avoid repeating chars");
  if (/(?:0123|1234|2345|3456|4567|5678|6789)/.test(p)) errors.push("avoid sequences");
  const parts = [username, name].filter(Boolean).flatMap(s => String(s).toLowerCase().split(/[@._\s-]+/));
  if (parts.some(x => x.length >= 3 && lower.includes(x))) errors.push("avoid personal info");
  return errors;
}
