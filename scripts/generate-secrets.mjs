import { randomBytes } from "crypto";

const jwt = randomBytes(48).toString("base64url");
const cron = randomBytes(24).toString("hex");

console.log("Copy into Vercel → Environment Variables (Production):\n");
console.log(`JWT_SECRET=${jwt}`);
console.log(`CRON_SECRET=${cron}`);
