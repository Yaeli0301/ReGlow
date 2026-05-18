/**
 * Push env vars from .env.local to Render (one-time setup).
 *
 * 1. Create API key: https://dashboard.render.com/u/settings#api-keys
 * 2. Add to .env.local:
 *    RENDER_API_KEY=rnd_...
 *    RENDER_SERVICE_ID=srv-...   (from service URL)
 * 3. Run: node scripts/sync-render-env.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ENV_FILE = resolve(process.cwd(), ".env.local");
const KEYS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "ENV_MODE",
  "NEXT_PUBLIC_APP_URL",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRICE_BASIC",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_PREMIUM",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || line.trimStart().startsWith("#")) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnvFile(ENV_FILE);
const apiKey = process.env.RENDER_API_KEY || env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID || env.RENDER_SERVICE_ID;

if (!apiKey || !serviceId) {
  console.error("Missing RENDER_API_KEY or RENDER_SERVICE_ID in .env.local");
  console.error("Get service id from Render dashboard URL: .../services/srv-xxxxx");
  process.exit(1);
}

const payload = KEYS.filter((k) => env[k]).map((key) => ({ key, value: env[key] }));

if (!payload.length) {
  console.error("No env vars to sync from .env.local");
  process.exit(1);
}

// Production URL override when syncing to Render
const mongo = payload.find((p) => p.key === "MONGODB_URI");
if (mongo && !mongo.value.includes("/reglow")) {
  console.warn("Warning: MONGODB_URI should include database name /reglow");
}

const appUrl = payload.find((p) => p.key === "NEXT_PUBLIC_APP_URL");
if (appUrl) appUrl.value = "https://reglow.onrender.com";

const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error("Render API error:", res.status, text);
  process.exit(1);
}

console.log("Synced", payload.map((p) => p.key).join(", "), "to Render service", serviceId);
console.log("Trigger redeploy in Render dashboard or wait for auto-deploy.");
