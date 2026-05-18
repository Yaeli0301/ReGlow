/**
 * Creates demo login users in local MongoDB.
 * Usage: node scripts/ensure-demo-users.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
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

const uri =
  process.env.MONGODB_URI_STANDARD ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/reglow";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  businessName: { type: String, required: true },
  role: { type: String, enum: ["business", "admin"], default: "business" },
  subscriptionTier: { type: String, default: "premium" },
  referralCode: { type: String, unique: true, sparse: true },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

const users = [
  {
    email: "demo@reglow.local",
    password: "Demo1234!",
    businessName: "סלון דמו ReGlow",
    role: "business",
  },
  {
    email: "admin@reglow.local",
    password: "Demo1234!",
    businessName: "ReGlow Admin",
    role: "admin",
  },
];

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, family: 4 });

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 10);
  await User.findOneAndUpdate(
    { email: u.email },
    {
      $set: {
        email: u.email,
        password: hash,
        businessName: u.businessName,
        role: u.role,
        subscriptionTier: "premium",
      },
      $setOnInsert: { referralCode: `SEED${u.role}${Date.now()}` },
    },
    { upsert: true }
  );
  console.log("OK:", u.email, `(${u.role})`);
}

await mongoose.disconnect();
console.log("Done. Login with demo@reglow.local / Demo1234!");
