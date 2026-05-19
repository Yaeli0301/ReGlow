#!/usr/bin/env node
/**
 * Promotes any email to admin (tier=premium) in production.
 *
 * Usage:
 *   npm run admin:promote -- your-email@example.com
 *   npm run admin:promote -- new@example.com NewPassword123!   (creates user if missing)
 *
 * Reads BASE_URL from arg --url=... or NEXT_PUBLIC_APP_URL or .env.local.
 * Reads CRON_SECRET from env / .env.local.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || line.trimStart().startsWith("#")) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

loadEnvLocal();

const args = process.argv.slice(2);
let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://re-glow-vhp6.vercel.app";
const cleanArgs = [];
for (const a of args) {
  if (a.startsWith("--url=")) {
    baseUrl = a.slice(6);
  } else {
    cleanArgs.push(a);
  }
}

const email = cleanArgs[0];
const password = cleanArgs[1]; // optional
const businessName = cleanArgs[2]; // optional

if (!email) {
  console.error("Usage: npm run admin:promote -- <email> [password] [businessName] [--url=https://...]");
  process.exit(1);
}

const secret = process.env.CRON_SECRET?.trim();
if (!secret || secret.length < 16) {
  console.error(
    "Missing CRON_SECRET (need 16+ chars). Generate with: npm run secrets:generate"
  );
  process.exit(1);
}

const url = `${baseUrl.replace(/\/$/, "")}/api/setup/promote-admin`;

console.log(`→ POST ${url}`);
console.log(`→ email: ${email}${password ? ` (will create if missing)` : ""}`);

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      email,
      ...(password ? { password } : {}),
      ...(businessName ? { businessName } : {}),
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`HTTP ${res.status} (non-JSON response):`);
    console.error(text);
    process.exit(1);
  }

  if (!res.ok || !data.success) {
    console.error(`✗ Failed (HTTP ${res.status})`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`✓ ${data.action}: ${data.email}`);
  console.log("");
  console.log("Now log in at:", `${baseUrl}/login`);
  if (data.action === "created" && password) {
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
  }
} catch (err) {
  console.error("✗ Request failed:", err.message);
  process.exit(1);
}
