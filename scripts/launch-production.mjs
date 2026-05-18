/**
 * Production launch checklist + remote checks.
 * Usage: node scripts/launch-production.mjs [baseUrl]
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const base = (process.argv[2] || "https://re-glow.vercel.app").replace(/\/$/, "");

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || line.trimStart().startsWith("#")) continue;
    out[m[1]] = m[2].trim();
  }
  return out;
}

const local = loadEnvLocal();
const required = [
  ["MONGODB_URI", "MongoDB Atlas connection"],
  ["JWT_SECRET", "Auth (min 32 chars)"],
  ["CRON_SECRET", "Cron + setup seed (min 16 chars)"],
];

console.log("=== ReGlow — הפעלה לפרודקשן ===\n");
console.log("Local .env.local:\n");
for (const [key, label] of required) {
  const v = local[key] || "";
  const ok =
    key === "JWT_SECRET"
      ? v.length >= 32
      : key === "CRON_SECRET"
        ? v.length >= 16
        : Boolean(v);
  console.log(ok ? "  ✓" : "  ✗", label, `(${key})`);
}
if (local.ENV_MODE === "demo") {
  console.log("\n  ⚠ ENV_MODE=demo — ב-Vercel חייב להיות production");
}
console.log("\nVercel (חובה ב-Production):\n");
console.log("  ENV_MODE=production");
console.log("  NEXT_PUBLIC_APP_URL=https://re-glow.vercel.app");
console.log("  MONGODB_URI=<mongodb+srv מ-Atlas או אינטגרציית Vercel>");
console.log("  JWT_SECRET=<node scripts/generate-secrets.mjs>");
console.log("  CRON_SECRET=<אותו סקריפט>");
console.log("  ENABLE_LANDING_DEMO=true   ← דמו מהדף נחיתה למכירה");
console.log("\nStripe (למכירה אמיתית): מפתחות live + Price IDs + webhook\n");

async function remote(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* html */
    }
    return { url, status: res.status, json };
  } catch (err) {
    return { url, error: err.message };
  }
}

console.log("Remote:", base, "\n");
const status = await remote("/api/setup/status");
const health = await remote("/api/health");

const me = await remote("/api/auth/me");
const apiUp = me.status === 401;
console.log(apiUp ? "  ✓" : "  ✗", "API (/api/auth/me)", me.status || me.error);

if (status.error) {
  console.log("  ✗ setup/status:", status.error);
} else if (status.status === 404) {
  console.log("  ○ setup/status 404 — דחפי קוד חדש ל-GitHub + Redeploy");
} else {
  const commit = status.json?.deploy?.commit;
  console.log(
    "  setup/status",
    status.status,
    status.json?.checks || "",
    commit ? `(commit ${commit})` : ""
  );
  if (status.status === 200 && commit && !String(commit).startsWith("32f872")) {
    console.log("  ○ commit on server differs from latest push — check Vercel Production deployment");
  }
}

if (health.error) {
  console.log("  ✗ health:", health.error);
} else if (health.status === 404) {
  console.log("  ○ /api/health 404 — אחרי Redeploy יופיע; בינתיים בדקי login");
} else {
  console.log("  health", health.status, health.json?.checks || health.json?.status);
}

console.log("\nאחרי Redeploy + משתני סביבה:");
console.log(`  curl -X POST ${base}/api/setup/seed -H "Authorization: Bearer <CRON_SECRET>"`);
console.log("  התחברות: demo@reglow.local / Demo1234!\n");

try {
  execSync("git status -sb", { stdio: "inherit" });
} catch {
  /* no git */
}
