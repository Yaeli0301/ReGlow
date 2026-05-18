export const WHATSAPP_TEMPLATES = {
  appointmentConfirmation:
    "Hi! 💖 Your appointment is confirmed. We can't wait to see you!",
  appointmentReminder:
    "Hi! 💖 Reminder: you have an appointment coming up. See you soon!",
  reEngagement:
    "Hey ❤️ it's been a while since your last visit. We'd love to see you again 💖",
  reactivation:
    "Hey ❤️ it's been a while since your last visit. We'd love to see you again 💖",
  winBack:
    "We miss you! 💖 Come back for a special treat — book your next visit today.",
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (!digits.startsWith("972") && digits.length <= 10) return "972" + digits;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function buildConfirmationMessage(
  businessName: string,
  date: Date,
  serviceName?: string
): string {
  const dateStr = date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `שלום! 💖 התור שלך אושר ב-${businessName}${serviceName ? ` (${serviceName})` : ""} — ${dateStr}`;
}
