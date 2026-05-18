import type { PriceLineItem } from "@/types/payments";
import { validatePriceAmount } from "@/lib/pricing-validation";

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `RG-${year}-${String(sequence).padStart(4, "0")}`;
}

export function nextInvoiceSequence(existingCount: number): number {
  return Math.max(0, existingCount) + 1;
}

export function sumLineItems(items: PriceLineItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function validateInvoicePayload(params: {
  amount: number;
  lineItems: PriceLineItem[];
}): void {
  validatePriceAmount(params.amount, "amount");
  for (const item of params.lineItems) {
    validatePriceAmount(item.amount, item.label);
  }
  const sum = sumLineItems(params.lineItems);
  if (params.lineItems.length > 0 && Math.abs(sum - params.amount) > 0.01) {
    throw new Error("INVOICE_AMOUNT_MISMATCH");
  }
}
