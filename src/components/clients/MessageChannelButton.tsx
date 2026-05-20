"use client";

import { Button } from "@/components/ui/Button";
import { getWhatsAppBlockReason } from "@/lib/whatsapp-safety";
import { buildMessageChannelLinks, isLikelyMobileIl } from "@/lib/messaging";

interface MessageChannelButtonProps {
  phone: string;
  message: string;
  optIn: boolean;
  lastMessageSentDate?: string | null;
  label?: string;
  smsLabel?: string;
  className?: string;
  compact?: boolean;
}

/**
 * WhatsApp when allowed; SMS always offered as fallback (especially on mobile IL numbers).
 */
export function MessageChannelButton({
  phone,
  message,
  optIn,
  lastMessageSentDate,
  label = "WhatsApp",
  smsLabel = "SMS",
  className,
  compact = false,
}: MessageChannelButtonProps) {
  const blockReason = getWhatsAppBlockReason({
    optIn,
    lastMessageSentDate: lastMessageSentDate ? new Date(lastMessageSentDate) : null,
  });

  const channels = buildMessageChannelLinks(phone, message);
  const preferSms = isLikelyMobileIl(phone);

  if (blockReason) {
    return (
      <div className={className}>
        <span title={blockReason} className="block text-[10px] text-gray-500">
          {!optIn ? "אין אישור לשליחה" : "המתיני 7 ימים"}
        </span>
        {optIn && (
          <a href={channels.sms} className="mt-1 inline-block text-xs text-brand-600 hover:underline">
            {smsLabel}
          </a>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <span className={`inline-flex gap-2 ${className || ""}`}>
        <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer">
          <Button variant="whatsapp" className="min-h-[44px] px-3 text-xs">
            {label}
          </Button>
        </a>
        <a
          href={channels.sms}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-brand-300 px-3 text-xs font-medium text-brand-700 hover:bg-brand-50"
        >
          {smsLabel}
        </a>
      </span>
    );
  }

  return (
    <div className={`flex flex-col gap-2 sm:flex-row ${className || ""}`}>
      {preferSms ? (
        <>
          <a href={channels.sms} className="flex-1">
            <Button variant="whatsapp" className="w-full min-h-[44px]">
              {smsLabel}
            </Button>
          </a>
          <a
            href={channels.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-medium text-brand-600 hover:underline"
          >
            {label}
          </a>
        </>
      ) : (
        <>
          <a href={channels.whatsapp} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="whatsapp" className="w-full min-h-[44px]">
              {label}
            </Button>
          </a>
          <a
            href={channels.sms}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-brand-300 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            {smsLabel}
          </a>
        </>
      )}
    </div>
  );
}
