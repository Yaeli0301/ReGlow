import { buildWhatsAppLink, formatPhoneForWhatsApp } from "@/lib/whatsapp";

export interface MessageChannelLinks {
  whatsapp: string;
  sms: string;
  phone: string;
}

/** Israeli mobile heuristic — 05x / +9725x */
export function isLikelyMobileIl(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("9725") && digits.length >= 11) return true;
  if (digits.startsWith("05") && digits.length >= 10) return true;
  return false;
}

export function buildMessageChannelLinks(phone: string, message: string): MessageChannelLinks {
  const formatted = formatPhoneForWhatsApp(phone);
  return {
    phone: formatted,
    whatsapp: buildWhatsAppLink(phone, message),
    sms: `sms:${formatted}?body=${encodeURIComponent(message)}`,
  };
}

export type MessageLocale = "he" | "en";

export function paymentLinkMessage(
  locale: MessageLocale,
  businessName: string,
  paymentUrl: string,
  amount: number,
  serviceName?: string
): string {
  if (locale === "en") {
    return `Hi! Please complete payment for your appointment at ${businessName}${serviceName ? ` (${serviceName})` : ""} — ₪${amount}:\n${paymentUrl}`;
  }
  return `שלום! להשלמת תשלום על התור ב-${businessName}${serviceName ? ` (${serviceName})` : ""} — ₪${amount}:\n${paymentUrl}`;
}
