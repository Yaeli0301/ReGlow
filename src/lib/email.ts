/**
 * Minimal email sender.
 * - Uses Resend HTTP API when RESEND_API_KEY is set.
 * - Otherwise logs the email body (so cron still "works" in dev).
 * - Never throws into the caller.
 */

import { logger } from "@/lib/logger";

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Defaults to ADMIN_EMAIL_FROM or "ReGlow <reports@reglow.app>". */
  from?: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider: "resend" | "none";
  reason?: string;
  id?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    args.from ||
    process.env.ADMIN_EMAIL_FROM ||
    "ReGlow <onboarding@resend.dev>"; // resend.dev works without DNS for testing

  const recipients = Array.isArray(args.to) ? args.to : [args.to];

  if (!key) {
    logger.info("Email not sent (RESEND_API_KEY not set) — logging body", {
      to: recipients,
      subject: args.subject,
      bytes: args.html.length,
    });
    return { sent: false, provider: "none", reason: "RESEND_API_KEY missing" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: args.subject,
        html: args.html,
        ...(args.text ? { text: args.text } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.warn("Email send failed", {
        status: res.status,
        detail: detail.slice(0, 300),
      });
      return { sent: false, provider: "resend", reason: `HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, provider: "resend", id: data.id };
  } catch (error) {
    logger.warn("Email send threw", {
      err: error instanceof Error ? error.message : String(error),
    });
    return {
      sent: false,
      provider: "resend",
      reason: error instanceof Error ? error.message : "unknown",
    };
  }
}

export function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim() || null;
}
