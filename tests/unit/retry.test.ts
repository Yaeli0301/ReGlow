import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/errors";

describe("withRetry", () => {
  it("retries then succeeds", async () => {
    let n = 0;
    const result = await withRetry(
      async () => {
        n++;
        if (n < 3) throw new Error("network");
        return "ok";
      },
      { attempts: 3, delayMs: 10 }
    );
    expect(result).toBe("ok");
    expect(n).toBe(3);
  });

  it("fails after max attempts", async () => {
    await expect(
      withRetry(async () => {
        throw new Error("always fail");
      }, { attempts: 2, delayMs: 5 })
    ).rejects.toThrow("always fail");
  });
});

describe("network failure simulation", () => {
  it("simulates flaky fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({ ok: true });

    const res = await withRetry(() => fetchMock(), { attempts: 2, delayMs: 5 });
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
