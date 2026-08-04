// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

function readHttpsPair(rootDir) {
  const keyPath = path.resolve(rootDir, "ssl/key.pem");
  const certPath = path.resolve(rootDir, "ssl/cert.pem");
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process for this config run
  const env = loadEnv(mode, process.cwd(), "");

  const useHttps = env.VITE_USE_HTTPS === "true";
  const https = useHttps ? readHttpsPair(process.cwd()) : undefined;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      https, // will be undefined (HTTP) unless VITE_USE_HTTPS=true AND certs exist
      strictPort: true,
    },
    preview: {
      host: true,
      port: 5173,
      https,
    },
  };
});
