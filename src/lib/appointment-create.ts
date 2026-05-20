import { Appointment } from "@/models/Appointment";
import { resolveServiceDuration } from "@/lib/service-duration";
import { assertSlotAvailable } from "@/lib/scheduling";
import { buildPaymentToken, buildRescheduleToken } from "@/lib/notifications";
import type { SelectedAddOn, PriceLineItem } from "@/types/payments";

export async function createValidatedAppointment(params: {
  userId: string;
  clientId: string;
  date: Date;
  serviceId?: string;
  serviceName?: string;
  selectedAddOns?: SelectedAddOn[];
  priceLineItems?: PriceLineItem[];
  finalPrice?: number;
  notes?: string;
  status?: "scheduled" | "completed" | "canceled";
}) {
  const durationMinutes = await resolveServiceDuration(params.userId, params.serviceId);
  await assertSlotAvailable(params.userId, params.date, durationMinutes);

  return Appointment.create({
    userId: params.userId,
    clientId: params.clientId,
    date: params.date,
    status: params.status || "scheduled",
    serviceId: params.serviceId,
    serviceName: params.serviceName,
    selectedAddOns: params.selectedAddOns || [],
    priceLineItems: params.priceLineItems || [],
    finalPrice: params.finalPrice ?? 0,
    durationMinutes,
    rescheduleToken: buildRescheduleToken(),
    paymentToken: buildPaymentToken(),
    notes: params.notes || "",
    paymentStatus: "unpaid",
  });
}
