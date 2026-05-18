import { format } from "date-fns";
import { he } from "date-fns/locale";
import { buildWhatsAppLink, WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { getNearestAvailableSlots } from "@/lib/scheduling";
import type { TimeSlot } from "@/lib/availability";

export function formatSlotsHebrew(slots: TimeSlot[]): string {
  return slots
    .map(
      (s, i) =>
        `${i + 1}. ${format(s.start, "EEE d/M HH:mm", { locale: he })}`
    )
    .join("\n");
}

export async function buildCancellationWhatsApp(params: {
  userId: string;
  clientPhone: string;
  businessName: string;
  appointmentDate: Date;
  serviceName?: string;
  serviceId?: string;
}): Promise<{ message: string; url: string; alternatives: TimeSlot[] }> {
  const alternatives = await getNearestAvailableSlots(
    params.userId,
    params.appointmentDate,
    60,
    3,
    params.serviceId
  );

  const dateStr = format(params.appointmentDate, "d/M/yyyy HH:mm", { locale: he });
  let message = `${WHATSAPP_TEMPLATES.appointmentCanceled}\n\n`;
  message += `תור שבוטל: ${params.serviceName || "שירות"} — ${dateStr}\n`;
  message += `${params.businessName}\n\n`;

  if (alternatives.length > 0) {
    message += `${WHATSAPP_TEMPLATES.rescheduleOffer}\n`;
    message += formatSlotsHebrew(alternatives);
  }

  return {
    message,
    url: buildWhatsAppLink(params.clientPhone, message),
    alternatives,
  };
}

export function buildRescheduleToken(): string {
  return `rs_${crypto.randomUUID().replace(/-/g, "")}`;
}
