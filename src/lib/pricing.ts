import type { IService, IServiceAddOn } from "@/models/Service";
import type { PriceLineItem, SelectedAddOn } from "@/types/payments";

export interface PricingInput {
  service?: Pick<IService, "name" | "basePrice" | "addOns"> | null;
  serviceName?: string;
  basePrice?: number;
  selectedAddOnIds?: string[];
  extraLineItems?: PriceLineItem[];
  manualFinalPrice?: number;
}

export function resolveSelectedAddOns(
  service: Pick<IService, "addOns"> | null | undefined,
  selectedAddOnIds: string[] = []
): SelectedAddOn[] {
  if (!service?.addOns?.length) return [];
  return selectedAddOnIds
    .map((id) => {
      const addOn = service.addOns.find(
        (a) => a._id.toString() === id && a.active !== false
      );
      if (!addOn) return null;
      return {
        addOnId: addOn._id.toString(),
        name: addOn.name,
        price: addOn.price,
      };
    })
    .filter((x): x is SelectedAddOn => x !== null);
}

import { validatePricingInput } from "@/lib/pricing-validation";

export function buildPriceBreakdown(input: PricingInput): {
  lineItems: PriceLineItem[];
  selectedAddOns: SelectedAddOn[];
  finalPrice: number;
  serviceName: string;
} {
  const serviceName = input.service?.name || input.serviceName || "שירות";
  const basePrice = input.service?.basePrice ?? input.basePrice ?? 0;

  validatePricingInput({
    basePrice,
    manualFinalPrice: input.manualFinalPrice,
    addOnPrices: input.service?.addOns?.map((a) => a.price),
  });

  const selectedAddOns = input.service
    ? resolveSelectedAddOns(input.service, input.selectedAddOnIds)
    : [];

  const lineItems: PriceLineItem[] = [
    { label: serviceName, amount: basePrice },
    ...selectedAddOns.map((a) => ({ label: `+ ${a.name}`, amount: a.price })),
    ...(input.extraLineItems || []),
  ];

  const calculated = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const finalPrice =
    typeof input.manualFinalPrice === "number" ? input.manualFinalPrice : calculated;

  if (
    typeof input.manualFinalPrice === "number" &&
    input.manualFinalPrice !== calculated
  ) {
    lineItems.push({
      label: "התאמת מחיר",
      amount: input.manualFinalPrice - calculated,
    });
  }

  return { lineItems, selectedAddOns, finalPrice, serviceName };
}

export function serializeService(s: {
  _id: { toString(): string };
  name: string;
  durationMinutes: number;
  basePrice?: number;
  price?: number;
  addOns?: IServiceAddOn[];
  sortOrder?: number;
  active?: boolean;
}) {
  const base = s.basePrice ?? (s as { price?: number }).price ?? 0;
  return {
    _id: s._id.toString(),
    name: s.name,
    durationMinutes: s.durationMinutes,
    basePrice: base,
    price: base,
    addOns: (s.addOns || []).map((a) => ({
      _id: a._id.toString(),
      name: a.name,
      price: a.price,
      active: a.active !== false,
    })),
    sortOrder: s.sortOrder ?? 0,
    active: s.active !== false,
  };
}
