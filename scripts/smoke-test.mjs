/**
 * Smoke test: pages + API routes + health checks.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */

const BASE = process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000";

const publicPages = ["/", "/login", "/register"];
const protectedPages = [
  "/dashboard",
  "/clients",
  "/appointments",
  "/schedule",
  "/lost-clients",
  "/billing",
];

const apisExpect401 = [
  "/api/auth/me",
  "/api/dashboard/stats",
  "/api/clients",
  "/api/appointments",
  "/api/referral",
  "/api/availability/weekly",
];

let failed = 0;
let passed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function fetchStatus(path, init) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init });
  return res.status;
}

console.log(`\nReGlow smoke test → ${BASE}\n`);

console.log("Health");
await check("GET /api/health", async () => {
  const res = await fetch(`${BASE}/api/health`);
  const data = await res.json();
  if (!data.checks) throw new Error("missing checks");
  if (data.checks.env_jwt !== "ok") throw new Error("JWT_SECRET missing");
  if (data.checks.env_mongo !== "ok") throw new Error("MONGODB_URI missing");
});

console.log("\nPublic pages (expect 200)");
for (const path of publicPages) {
  await check(`GET ${path}`, async () => {
    const status = await fetchStatus(path);
    if (status !== 200) throw new Error(`status ${status}`);
  });
}

console.log("\nProtected pages without cookie (expect 307 redirect to login)");
for (const path of protectedPages) {
  await check(`GET ${path}`, async () => {
    const status = await fetchStatus(path);
    if (status !== 307 && status !== 302) throw new Error(`status ${status}, expected redirect`);
  });
}

console.log("\nProtected APIs without auth (expect 401)");
for (const path of apisExpect401) {
  await check(`GET ${path}`, async () => {
    const status = await fetchStatus(path);
    if (status !== 401) throw new Error(`status ${status}, expected 401`);
  });
}

console.log("\nStripe config (expect 200 JSON)");
await check("GET /api/stripe/config", async () => {
  const res = await fetch(`${BASE}/api/stripe/config`);
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  const data = await res.json();
  if (typeof data.configured !== "boolean") throw new Error("invalid body");
});

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);
process.exit(failed > 0 ? 1 : 0);
