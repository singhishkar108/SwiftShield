// backend/src/server.js
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import express from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readIfExists(p) {
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

async function start() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  const app = createApp();

  // ✅ align with compose/CI
  const httpPort = Number(env.PORT) || 4001;
  const httpsPort = Number(process.env.HTTPS_PORT) || httpPort + 1;

  // ✅ allow forcing HTTP in containers/CI to keep healthchecks simple
  const forceHttp = String(process.env.USE_HTTPS || "false").toLowerCase() === "false";

  // Local self-signed certs (for dev only)
  const sslDir = path.join(__dirname, "..", "ssl");
  const key = readIfExists(path.join(sslDir, "key.pem"));
  const cert = readIfExists(path.join(sslDir, "cert.pem"));

  if (!forceHttp && key && cert) {
    const tlsOptions = {
      key,
      cert,
      minVersion: "TLSv1.2",
      ciphers: [
        "TLS_AES_256_GCM_SHA384",
        "TLS_AES_128_GCM_SHA256",
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-ECDSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES128-GCM-SHA256",
      ].join(":"),
      honorCipherOrder: true,
    };

    // HTTPS app
    const httpsServer = createHttpsServer(tlsOptions, app);
    httpsServer.listen(httpsPort, "0.0.0.0", () => {
      console.log(`API (HTTPS) : https://0.0.0.0:${httpsPort}`);
      console.log(`Health      : https://0.0.0.0:${httpsPort}/health`);
    });

    // HTTP -> HTTPS redirect
    const redirectApp = express();
    redirectApp.use((req, res) => {
      const hostOnly = (req.headers.host || `localhost:${httpPort}`).split(":")[0];
      const location = `https://${hostOnly}:${httpsPort}${req.url}`;
      res.redirect(301, location);
    });
    const httpServer = createHttpServer(redirectApp);
    httpServer.listen(httpPort, "0.0.0.0", () => {
      console.log(`HTTP redirector : http://0.0.0.0:${httpPort}  →  https://0.0.0.0:${httpsPort}`);
    });
  } else {
    console.warn("⚠️  HTTPS disabled (USE_HTTPS=false or missing ssl/*). Running HTTP only.");
    const httpServer = createHttpServer(app);
    httpServer.listen(httpPort, "0.0.0.0", () => {
      console.log(`API (HTTP only) : http://0.0.0.0:${httpPort}`);
      console.log(`Health          : http://0.0.0.0:${httpPort}/health`);
    });
  }
}

start().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});
