import { subDays, subHours } from "date-fns";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
import { ReactivationLog } from "@/models/ReactivationLog";
import { WHATSAPP_TEMPLATES, buildWhatsAppLink } from "@/lib/whatsapp";
import { canAccess } from "@/lib/subscription";
import { computeClientStatus } from "@/lib/client-status";
import { canSendAutomatedWhatsApp, COOLDOWN_DAYS } from "@/lib/whatsapp-safety";
import { getNearestAvailableSlots } from "@/lib/scheduling";
import { formatSlotsHebrew } from "@/lib/notifications";

const LOST_MIN_DAYS = 30;
const LOST_MAX_DAYS = 45;
const STEP2_DELAY_HOURS = 48;

export async function runRetentionEngine(): Promise<{
  step1: number;
  step2: number;
  skipped: number;
  errors: string[];
}> {
  const now = new Date();
  const lostAfter = subDays(now, LOST_MIN_DAYS);
  const lostBefore = subDays(now, LOST_MAX_DAYS);
  const step2Threshold = subHours(now, STEP2_DELAY_HOURS);
  const cooldownDate = subDays(now, COOLDOWN_DAYS);

  const users = await User.find({
    subscriptionTier: { $in: ["pro", "premium"] },
  }).select("_id subscriptionTier businessName");

  let step1 = 0;
  let step2 = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (!canAccess(user.subscriptionTier, "automation")) continue;

    const clients = await Client.find({
      userId: user._id,
      optIn: true,
      lastVisitDate: { $lte: lostAfter, $gte: lostBefore },
    });

    for (const client of clients) {
      try {
        if (computeClientStatus(client.lastVisitDate) !== "lost") {
          skipped++;
          continue;
        }

        if (!canSendAutomatedWhatsApp(client)) {
          skipped++;
          continue;
        }

        if (client.lastMessageSentDate && client.lastMessageSentDate > cooldownDate) {
          skipped++;
          continue;
        }

        const step = client.retentionStep ?? 0;

        if (step === 0) {
          const message = WHATSAPP_TEMPLATES.retentionStep1;
          const whatsappUrl = buildWhatsAppLink(client.phone, message);

          await ReactivationLog.create({
            userId: user._id,
            clientId: client._id,
            phone: client.phone,
            message,
            whatsappUrl,
            sentAt: now,
            automated: true,
          });

          client.retentionStep = 1;
          client.retentionStepAt = now;
          client.lastMessageSentDate = now;
          await client.save();
          step1++;
          continue;
        }

        if (
          step === 1 &&
          client.retentionStepAt &&
          client.retentionStepAt <= step2Threshold
        ) {
          const slots = await getNearestAvailableSlots(user._id.toString(), now, 60, 3);
          let message = WHATSAPP_TEMPLATES.retentionStep2;
          if (slots.length > 0) {
            message += `\n\n${formatSlotsHebrew(slots)}`;
          }
          const whatsappUrl = buildWhatsAppLink(client.phone, message);

          await ReactivationLog.create({
            userId: user._id,
            clientId: client._id,
            phone: client.phone,
            message,
            whatsappUrl,
            sentAt: now,
            automated: true,
          });

          client.retentionStep = 2;
          client.retentionStepAt = now;
          client.lastMessageSentDate = now;
          await client.save();
          step2++;
        }
      } catch (err) {
        errors.push(`${client._id}: ${String(err)}`);
      }
    }
  }

  return { step1, step2, skipped, errors };
}

/** Reset retention when client books again */
export async function resetClientRetention(clientId: string) {
  await Client.findByIdAndUpdate(clientId, {
    retentionStep: 0,
    retentionStepAt: null,
  });
}
