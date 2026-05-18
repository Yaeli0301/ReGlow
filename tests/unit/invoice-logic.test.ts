import { describe, it, expect } from "vitest";
import {
  formatInvoiceNumber,
  nextInvoiceSequence,
  sumLineItems,
  validateInvoicePayload,
} from "@/lib/invoice-logic";

describe("invoice logic", () => {
  it("formats invoice number", () => {
    expect(formatInvoiceNumber(2026, 7)).toBe("RG-2026-0007");
  });

  it("increments sequence", () => {
    expect(nextInvoiceSequence(12)).toBe(13);
  });

  it("sums line items", () => {
    expect(
      sumLineItems([
        { label: "A", amount: 100 },
        { label: "B", amount: 50 },
      ])
    ).toBe(150);
  });

  it("validates matching totals", () => {
    expect(() =>
      validateInvoicePayload({
        amount: 150,
        lineItems: [
          { label: "A", amount: 100 },
          { label: "B", amount: 50 },
        ],
      })
    ).not.toThrow();
  });

  it("rejects amount mismatch", () => {
    expect(() =>
      validateInvoicePayload({
        amount: 99,
        lineItems: [{ label: "A", amount: 100 }],
      })
    ).toThrow("INVOICE_AMOUNT_MISMATCH");
  });
});
