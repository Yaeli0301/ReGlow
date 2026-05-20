"use client";

import { MessageChannelButton } from "@/components/clients/MessageChannelButton";

interface WhatsAppButtonProps {
  phone: string;
  message: string;
  optIn: boolean;
  lastMessageSentDate?: string | null;
  label?: string;
  className?: string;
}

/** @deprecated Prefer MessageChannelButton — kept for existing imports */
export function WhatsAppButton(props: WhatsAppButtonProps) {
  return <MessageChannelButton {...props} compact />;
}
