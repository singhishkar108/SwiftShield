// backend/src/config/env.js
import "dotenv/config";
import { z } from "zod";

/* ---------- helpers ---------- */

// decode hex/base64/base64url 32-byte key
function decodeDataKeyToBytes(raw) {
  if (typeof raw !== "string" || !raw) throw new Error("DATA_KEY must be set");
  let s = raw.trim();

  // strip accidental wrapping quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }

  // hex (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    return Buffer.from(s, "hex");
  }

  // base64 / base64url
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
  let buf;
  try {
    buf = Buffer.from(b64 + pad, "base64");
  } catch {
    throw new Error("DATA_KEY must be a 32-byte key (base64/base64url or hex).");
  }
  if (buf.length !== 32) throw new Error("DATA_KEY must decode to exactly 32 bytes.");
  return buf;
}

// Parse CORS_ORIGIN into a normalized array of http(s) origins
const CorsOriginArray = z
  .string()
  .min(1, "CORS_ORIGIN is required")
  .transform((raw) => {
    // strip wrapping quotes then split on commas
    const s = raw.trim().replace(/^['"]|['"]$/g, "");
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  })
  .pipe(
    z
      .array(z.string())
      .nonempty()
      .transform((arr) => {
        const out = [];
        const bad = [];
        for (const item of arr) {
          try {
            const u = new URL(item);
            if (u.protocol !== "http:" && u.protocol !== "https:") {
              throw new Error("protocol must be http or https");
            }
            // normalize to protocol + host (host includes port if present)
            out.push(`${u.protocol}//${u.host}`);
          } catch (e) {
            bad.push(`${item} (${e.message})`);
          }
        }
        if (bad.length) {
          throw new Error(
            `Invalid CORS_ORIGIN entr${bad.length > 1 ? "ies" : "y"}: ${bad.join(", ")}`
          );
        }
        return out;
      })
  );

/* ---------- schema ---------- */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4001),

  MONGO_URI: z
    .string()
    .refine((s) => s.startsWith("mongodb://") || s.startsWith("mongodb+srv://"), {
      message: "MONGO_URI must start with mongodb:// or mongodb+srv://",
    }),

  // Comma-separated list (e.g., "http://localhost:5173,https://pay.yourbank.co.za")
  CORS_ORIGIN: CorsOriginArray,

  // Auth/secrets
  PWD_PEPPER: z.string().min(16),
  JWT_SECRET: z.string().min(32),

  // 32-byte key (base64/base64url/hex accepted)
  DATA_KEY: z.string().min(1),

  // Token TTLs
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),

  // SMTP (required by your project; make optional if you want)
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

// Decode at-rest data key once
const DATA_KEY_BYTES = decodeDataKeyToBytes(parsed.data.DATA_KEY);

export const env = {
  ...parsed.data,

  // Default SMTP_FROM to SMTP_USER if not provided
  SMTP_FROM: parsed.data.SMTP_FROM ?? parsed.data.SMTP_USER,

  // Alias commonly used name for at-rest crypto consumers
  AT_REST_KEY: DATA_KEY_BYTES,
};

// Single source of truth for the AES key (32 bytes)
export function getDataKeyBytes() {
  return DATA_KEY_BYTES;
}

// dev visibility (safe)
if (env.NODE_ENV !== "production") {
  console.log("[env] CORS_ORIGIN =", env.CORS_ORIGIN);
  console.log("[env] PORT =", env.PORT);
}
