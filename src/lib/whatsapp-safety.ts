import { subDays } from "date-fns";

const COOLDOWN_DAYS = 7;

export interface WhatsAppEligibleClient {
  optIn: boolean;
  lastMessageSentDate?: Date | null;
}

/** Automated outreach requires explicit opt-in and respects 7-day cooldown. */
export function canSendAutomatedWhatsApp(client: WhatsAppEligibleClient): boolean {
  if (!client.optIn) return false;

  if (!client.lastMessageSentDate) return true;

  const cooldownStart = subDays(new Date(), COOLDOWN_DAYS);
  return new Date(client.lastMessageSentDate) <= cooldownStart;
}

export function getWhatsAppBlockReason(client: WhatsAppEligibleClient): string | null {
  if (!client.optIn) {
    return "Client has not opted in to WhatsApp messages";
  }
  if (!canSendAutomatedWhatsApp(client)) {
    return "Message sent recently — wait 7 days between messages";
  }
  return null;
}

export { COOLDOWN_DAYS };
