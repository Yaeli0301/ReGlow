"use client";

import { Button } from "@/components/ui/Button";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getWhatsAppBlockReason } from "@/lib/whatsapp-safety";

interface WhatsAppButtonProps {
  phone: string;
  message: string;
  optIn: boolean;
  lastMessageSentDate?: string | null;
  label?: string;
  className?: string;
}

export function WhatsAppButton({
  phone,
  message,
  optIn,
  lastMessageSentDate,
  label = "WhatsApp",
  className,
}: WhatsAppButtonProps) {
  const blockReason = getWhatsAppBlockReason({
    optIn,
    lastMessageSentDate: lastMessageSentDate ? new Date(lastMessageSentDate) : null,
  });

  if (blockReason) {
    return (
      <span title={blockReason} className="inline-block">
        <Button variant="whatsapp" disabled className={className}>
          {label}
        </Button>
        <span className="mt-0.5 block text-[10px] text-gray-400 max-w-[140px]">
          {!optIn ? "No opt-in" : "Wait 7 days"}
        </span>
      </span>
    );
  }

  return (
    <a href={buildWhatsAppLink(phone, message)} target="_blank" rel="noopener noreferrer">
      <Button variant="whatsapp" className={className}>
        {label}
      </Button>
    </a>
  );
}
