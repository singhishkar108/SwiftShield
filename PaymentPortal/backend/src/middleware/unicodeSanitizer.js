import { findInvisibleChars } from "../utils/unicode.js";

//Walks an object tree and checks all string values.
//On the first violation, responds 400 with details.
export function unicodeSanitizer() {
  return (req, res, next) => {
    try {
      // Check body, query, and params
      for (const which of ["body", "query", "params"]) {
        const root = req[which];
        const path = which;
        if (root && typeof root === "object") {
          const err = scanNode(root, path, 0);
          if (err) {
            return res.status(400).json({
              error: "invalid characters",
              field: err.path,
              details: err.matches
            });
          }
        }
      }
      return next();
    } catch (e) {
      return res.status(400).json({ error: "invalid characters" });
    }
  };
}

function scanNode(node, path, depth) {
  if (depth > 32) return null; // safety
  if (node == null) return null;

  if (typeof node === "string") {
    const s = node.normalize("NFC");
    const matches = findInvisibleChars(s);
    if (matches.length) {
      return { path, matches };
    }
    return null;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const childErr = scanNode(node[i], `${path}[${i}]`, depth + 1);
      if (childErr) return childErr;
    }
    return null;
  }

  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      const childErr = scanNode(v, `${path}.${k}`, depth + 1);
      if (childErr) return childErr;
    }
    return null;
  }

  return null;
}
