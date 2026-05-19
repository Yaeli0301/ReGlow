import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import {
  validateEnv,
  assertEnvValid,
  mongoUriHasDbName,
} from "@/lib/system/env-validator";
import {
  getSystemStateSync,
  getSystemState,
} from "@/lib/system/system-state";
import {
  getKillSwitchState,
  setKillSwitch,
  invalidateKillSwitchCache,
} from "@/lib/system/kill-switch";
import { isExemptFromSystemGuard } from "@/lib/system/edge-guard";
import {
  isProduction,
  isDemo,
  assertProductionNeverUsesInMemory,
} from "@/lib/system/mode";
import { getCached, setCached } from "@/lib/analytics/cache";

describe("system safety", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    invalidateKillSwitchCache();
    await setKillSwitch(false);
  });

  describe("env-validator", () => {
    it("validateEnv returns blocking array when JWT missing in production", () => {
      const orig = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      process.env.ENV_MODE = "production";
      const result = validateEnv();
      expect(result.blocking.some((b) => b.startsWith("JWT_SECRET"))).toBe(true);
      process.env.JWT_SECRET = orig;
    });

    it("mongoUriHasDbName detects db segment", () => {
      expect(mongoUriHasDbName("mongodb://localhost:27017/reglow")).toBe(true);
      expect(mongoUriHasDbName("mongodb://localhost:27017/?retryWrites=true")).toBe(
        false
      );
    });

    it("assertEnvValid does not throw in test (non-production mode)", () => {
      const orig = process.env.ENV_MODE;
      process.env.ENV_MODE = "demo";
      expect(() => assertEnvValid()).not.toThrow();
      process.env.ENV_MODE = orig;
    });
  });

  describe("system state", () => {
    it("getSystemStateSync returns a valid state", () => {
      process.env.ENV_MODE = "demo";
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
      }
      const snap = getSystemStateSync();
      expect(["READY", "DEGRADED", "BLOCKED"]).toContain(snap.state);
    });

    it("getSystemState returns snapshot with checks", async () => {
      const snap = await getSystemState();
      expect(snap.state).toBeDefined();
      expect(snap.checks).toHaveProperty("database");
    });
  });

  describe("kill switch", () => {
    it("activates and deactivates kill switch", async () => {
      await setKillSwitch(true, { reason: "test", updatedBy: "admin" });
      invalidateKillSwitchCache();
      const on = await getKillSwitchState();
      expect(on.active).toBe(true);
      expect(on.reason).toBe("test");

      await setKillSwitch(false);
      invalidateKillSwitchCache();
      const off = await getKillSwitchState();
      expect(off.active).toBe(false);
    });

    it("BLOCKED state when kill switch active", async () => {
      await setKillSwitch(true, { reason: "maintenance" });
      invalidateKillSwitchCache();
      const snap = await getSystemState();
      expect(snap.state).toBe("BLOCKED");
      expect(snap.reasons.some((r) => r.includes("Kill") || r.includes("maintenance"))).toBe(
        true
      );
    });
  });

  describe("middleware guard", () => {
    it("exempt paths include health and kill-switch", () => {
      expect(isExemptFromSystemGuard("/api/health")).toBe(true);
      expect(isExemptFromSystemGuard("/api/admin/kill-switch")).toBe(true);
      expect(isExemptFromSystemGuard("/api/system/status")).toBe(true);
      expect(isExemptFromSystemGuard("/api/clients")).toBe(false);
    });
  });

  describe("mode isolation", () => {
    it("isProduction and isDemo are mutually exclusive in demo mode", () => {
      const orig = process.env.ENV_MODE;
      process.env.ENV_MODE = "demo";
      expect(isDemo()).toBe(true);
      expect(isProduction()).toBe(false);
      process.env.ENV_MODE = orig;
    });

    it("assertProductionNeverUsesInMemory throws when flag set in production", () => {
      const origMode = process.env.ENV_MODE;
      const origDemo = process.env.DEMO_USE_MEMORY;
      process.env.ENV_MODE = "production";
      process.env.DEMO_USE_MEMORY = "true";
      expect(() => assertProductionNeverUsesInMemory()).toThrow(/cannot use DEMO_USE_MEMORY/);
      process.env.ENV_MODE = origMode;
      process.env.DEMO_USE_MEMORY = origDemo;
    });
  });

  describe("analytics cache", () => {
    it("caches and returns values within TTL", async () => {
      let calls = 0;
      const v = await (async () => {
        const hit = getCached<number>("test-key");
        if (hit !== null) return hit;
        calls++;
        const val = 42;
        setCached("test-key", val, 60_000);
        return val;
      })();
      expect(v).toBe(42);
      const hit = getCached<number>("test-key");
      expect(hit).toBe(42);
      expect(calls).toBe(1);
    });
  });
});
