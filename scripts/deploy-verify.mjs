/**
 * Pre/post deploy checks. Usage: node scripts/deploy-verify.mjs [baseUrl]
 */

const base = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function check(path, expectOk = true) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* html */
    }
    const ok = expectOk ? res.ok : true;
    console.log(ok ? "OK" : "FAIL", res.status, path, json?.status || json?.checks || "");
    return { path, status: res.status, ok: res.ok, json };
  } catch (err) {
    console.log("FAIL", path, err.message);
    return { path, ok: false, error: err.message };
  }
}

console.log("Verifying", base, "\n");

const apiAlive = await check("/api/auth/me", false);
const health = await check("/api/health");
const status = await check("/api/setup/status");
const home = await check("/");
const login = await check("/login");

const apiUp = apiAlive.status === 401 || apiAlive.json?.error === "Unauthorized";
if (!apiUp) {
  console.log("\nAPI not responding — check Vercel deployment and GitHub connection.");
  process.exit(1);
}

const healthy =
  health.json?.checks?.database === "ok" && health.json?.checks?.env_jwt === "ok";

const statusOk =
  status.json?.checks?.mongo && status.json?.checks?.jwt && status.json?.envMode === "production";

if (!healthy && !statusOk) {
  if (health.status === 404) {
    console.log("\n/api/health missing — push latest code and Redeploy (API is up via /api/auth/me).");
  }
  console.log(
    "\nDatabase or env not ready — set MONGODB_URI, JWT_SECRET, ENV_MODE=production on Vercel;"
  );
  console.log("Atlas → Network Access → 0.0.0.0/0, then Redeploy.");
  console.log("Then: curl -X POST", base.replace(/\/$/, "") + "/api/setup/seed", '-H "Authorization: Bearer $CRON_SECRET"');
  process.exit(1);
}

console.log("\nAll checks passed.");
process.exit(0);
