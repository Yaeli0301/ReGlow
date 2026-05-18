import { describe, it, expect } from "vitest";
import { buildPriceBreakdown, resolveSelectedAddOns } from "@/lib/pricing";
import { AppError } from "@/lib/errors";

const mockService = {
  name: "Gel Nails",
  basePrice: 150,
  addOns: [
    { _id: { toString: () => "a1" }, name: "עיצוב", price: 30, active: true },
    { _id: { toString: () => "a2" }, name: "הסרה", price: 20, active: false },
  ],
};

describe("pricing", () => {
  it("calculates base + add-ons", () => {
    const result = buildPriceBreakdown({
      service: mockService,
      selectedAddOnIds: ["a1"],
    });
    expect(result.finalPrice).toBe(180);
    expect(result.selectedAddOns).toHaveLength(1);
    expect(result.lineItems[0].amount).toBe(150);
  });

  it("ignores inactive add-ons", () => {
    const addOns = resolveSelectedAddOns(mockService, ["a2"]);
    expect(addOns).toHaveLength(0);
  });

  it("applies manual final price adjustment", () => {
    const result = buildPriceBreakdown({
      service: mockService,
      manualFinalPrice: 200,
    });
    expect(result.finalPrice).toBe(200);
    expect(result.lineItems.some((l) => l.label === "התאמת מחיר")).toBe(true);
  });

  it("rejects negative base price", () => {
    expect(() =>
      buildPriceBreakdown({ serviceName: "X", basePrice: -10 })
    ).toThrow(AppError);
  });

  it("rejects invalid manual price", () => {
    expect(() =>
      buildPriceBreakdown({
        service: mockService,
        manualFinalPrice: Number.NaN,
      })
    ).toThrow(AppError);
  });
});
