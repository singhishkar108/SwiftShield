// backend/src/utils/unicode.js
// Reject invisible / control Unicode that can be used for spoofing & injection.
// Allowed whitespace: space, tab, CR, LF. Everything else in Cc/Cf is stripped or flagged.

// C0 controls (except \t \n \r): U+0000–0008, 000B, 000C, 000E–001F
// DEL & C1 controls: U+007F–009F
// Invisibles: ZWSP..RLM (U+200B–200F), BOM (U+FEFF), bidi isolates U+2066–2069
const C0_WITHOUT_TAB_LF_CR = "\u0000-\u0008\u000B\u000C\u000E-\u001F";
const C1_AND_DEL = "\u007F-\u009F";
const INVISIBLE_BLOCK = "\u200B-\u200F\uFEFF\u2066-\u2069";

// Single source regex (global)
export const INVISIBLE_RE = new RegExp(
  `[${C0_WITHOUT_TAB_LF_CR}${C1_AND_DEL}${INVISIBLE_BLOCK}]`,
  "g"
);

/**
 * Find all invisible/control characters in a string.
 * @param {string} str
 * @returns {Array<{char:string, code:string, index:number}>}
 */
export function findInvisibleChars(str) {
  if (typeof str !== "string") return [];
  const s = str.normalize("NFC");
  const out = [];
  INVISIBLE_RE.lastIndex = 0;
  let m;
  while ((m = INVISIBLE_RE.exec(s))) {
    const ch = m[0];
    out.push({
      char: ch,
      code: "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
      index: m.index,
    });
  }
  return out;
}

/**
 * Strip all invisible/control characters from a string.
 * @param {string} str
 * @returns {string}
 */
export function stripControlAndInvisible(str) {
  if (typeof str !== "string") return str;
  return str.normalize("NFC").replace(INVISIBLE_RE, "");
}

/**
 * Quick check: does the string contain any blocked code points?
 * @param {string} str
 * @returns {boolean}
 */
export function hasInvisibleChars(str) {
  if (typeof str !== "string") return false;
  INVISIBLE_RE.lastIndex = 0;
  return INVISIBLE_RE.test(str);
}
