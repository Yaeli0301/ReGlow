import { AppError } from "@/lib/errors";

export function validatePriceAmount(amount: number, field = "price"): void {
  if (!Number.isFinite(amount)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `Invalid ${field}: not a number`,
      userMessage: "מחיר לא תקין",
    });
  }
  if (amount < 0) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `Invalid ${field}: negative`,
      userMessage: "מחיר לא יכול להיות שלילי",
    });
  }
  if (amount > 1_000_000) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `Invalid ${field}: too large`,
      userMessage: "מחיר חורג מהמותר",
    });
  }
}

export function validatePricingInput(input: {
  basePrice?: number;
  manualFinalPrice?: number;
  addOnPrices?: number[];
}): void {
  if (input.basePrice !== undefined) validatePriceAmount(input.basePrice, "basePrice");
  if (input.manualFinalPrice !== undefined) {
    validatePriceAmount(input.manualFinalPrice, "manualFinalPrice");
  }
  for (const p of input.addOnPrices || []) {
    validatePriceAmount(p, "addOn");
  }
}
