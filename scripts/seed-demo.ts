import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/lib/mongodb";

process.env.ENV_MODE = "demo";

async function main() {
  await connectDB();
  const { seedDemoData } = await import("../src/lib/seed/demo-seed");
  const result = await seedDemoData({ force: true });
  console.log("Demo seeded:", result);
  await disconnectDB();
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
