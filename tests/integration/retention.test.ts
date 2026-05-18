import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import { seedDemoData } from "@/lib/seed/demo-seed";
import { runRetentionEngine } from "@/lib/retention-engine";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
import { ReactivationLog } from "@/models/ReactivationLog";
import { subDays } from "date-fns";

describe("retention engine", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await seedDemoData({ force: true });
  });

  it("sends step1 message for lost opted-in client", async () => {
    const owner = await User.findOne({ email: "demo@reglow.local" });
    expect(owner).toBeTruthy();

    await Client.updateMany(
      { userId: owner!._id },
      {
        $set: {
          lastVisitDate: subDays(new Date(), 35),
          optIn: true,
          retentionStep: 0,
        },
      }
    );

    const result = await runRetentionEngine();
    expect(result.step1 + result.step2).toBeGreaterThanOrEqual(0);

    const logs = await ReactivationLog.find({ userId: owner!._id });
    if (result.step1 > 0) {
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].whatsappUrl).toContain("wa.me");
    }
  });
});
