/**
 * Push env from .env.local to Vercel (requires: npx vercel login && npx vercel link)
 * Usage: npm run vercel:sync-env
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const ENV_FILE = resolve(process.cwd(), ".env.local");
const KEYS = [
  "MONGODB_URI",
  "MONGODB_URI_STANDARD",
  "JWT_SECRET",
  "ENV_MODE",
  "ENABLE_LANDING_DEMO",
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
const productionUrl = process.env.PROD_URL || "https://re-glow-vhp6.vercel.app";

for (const key of KEYS) {
  let value = env[key];
  if (!value) continue;
  if (key === "NEXT_PUBLIC_APP_URL") value = productionUrl;
  if (key === "ENV_MODE") value = "production";
  if (key === "ENABLE_LANDING_DEMO" && !value) value = "true";
  if (key === "MONGODB_URI_STANDARD" && env.MONGODB_URI) continue;
  console.log("Setting", key, "...");
  try {
    execSync(`npx vercel env add ${key} production preview development --force`, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    });
  } catch {
    console.error("Failed:", key, "— run: npx vercel login && npx vercel link");
    process.exit(1);
  }
}

console.log("Done. Redeploy: npx vercel --prod");
