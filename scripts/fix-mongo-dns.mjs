/**
 * Windows fix: Node cannot resolve mongodb+srv (querySrv ECONNREFUSED).
 * Builds MONGODB_URI_STANDARD from nslookup + existing MONGODB_URI in .env.local.
 *
 * Usage: node scripts/fix-mongo-dns.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

let content = readFileSync(envPath, "utf8");
const srvMatch = content.match(/MONGODB_URI=(mongodb\+srv:\/\/[^\r\n]+)/);
if (!srvMatch) {
  console.error("No MONGODB_URI (srv) in .env.local");
  process.exit(1);
}

const srv = srvMatch[1];
const parsed = new URL(srv.replace("mongodb+srv://", "https://"));
const user = decodeURIComponent(parsed.username);
const pass = decodeURIComponent(parsed.password);
const db = parsed.pathname.replace(/^\//, "") || "reglow";
const host = parsed.hostname; // cluster0.iociobd.mongodb.net

const ns = execSync(`nslookup -type=SRV _mongodb._tcp.${host}`, { encoding: "utf8" });
const shards = [...ns.matchAll(/svr hostname\s*=\s*(\S+)/gi)].map((m) => m[1]);
if (!shards.length) {
  console.error("nslookup found no shard hosts");
  process.exit(1);
}

const hostsPart = shards.map((h) => `${h}:27017`).join(",");
const clusterId = shards[0].match(/ac-([^-]+)-/)?.[1];
const replicaGuess = clusterId ? `atlas-${clusterId}-shard-0` : "atlas-shard-0";

const standard =
  `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hostsPart}/${db}` +
  `?ssl=true&authSource=admin&replicaSet=${replicaGuess}`;

const line = `MONGODB_URI_STANDARD=${standard}`;
if (/MONGODB_URI_STANDARD=/.test(content)) {
  content = content.replace(/MONGODB_URI_STANDARD=.*/g, line);
} else {
  content = content.trimEnd() + "\n" + line + "\n";
}

writeFileSync(envPath, content, "utf8");
console.log("Added MONGODB_URI_STANDARD with hosts:", shards.join(", "));
console.log("Restart dev server: npm run dev:clean");
