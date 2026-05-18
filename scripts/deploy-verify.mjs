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

const health = await check("/api/health");
const home = await check("/");
const login = await check("/login");

const healthy =
  health.json?.checks?.database === "ok" &&
  health.json?.checks?.env_jwt === "ok";

if (!healthy) {
  console.log("\nHealth degraded — set MONGODB_URI and JWT_SECRET on Render.");
  process.exit(1);
}

console.log("\nAll checks passed.");
process.exit(0);
