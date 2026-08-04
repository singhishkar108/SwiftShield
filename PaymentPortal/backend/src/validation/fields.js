// Whitelist regex + small helpers (server is source of truth)
// Input Whitelisting (Task 2: Input Whitelisting – exceeds)
// Strict allow-list regex for each field; blocks injection/invalid chars up front.
// Same patterns are mirrored on the frontend for good UX, but server rules win.

export const reFullName = /^[A-Za-z' -]{2,80}$/;
export const reSAIdNumber = /^\d{13}$/;
export const reAccountNumber = /^\d{8,16}$/;
export const reUsername = /^[a-zA-Z0-9._-]{3,30}$/;

// amount: 0 or positive, up to 2 decimals, cap length for safety
export const reAmount = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

// SWIFT/BIC: 8 or 11 chars, A–Z for bank/country/location; digits allowed in last parts
export const reSwift = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// demo currency allow-list (server-enforced)
export const currencyAllow = new Set(["ZAR", "USD", "EUR", "GBP"]);
