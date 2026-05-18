import { subDays } from "date-fns";
import { Client } from "@/models/Client";
import { ReactivationLog } from "@/models/ReactivationLog";
import { User } from "@/models/User";
import { WHATSAPP_TEMPLATES, buildWhatsAppLink } from "@/lib/whatsapp";
import { canAccess } from "@/lib/subscription";
import { computeClientStatus } from "@/lib/client-status";
import { canSendAutomatedWhatsApp, COOLDOWN_DAYS } from "@/lib/whatsapp-safety";
import { mergeDuplicateClients } from "@/lib/client-service";

const REACTIVATION_DAYS = 30;

export async function runReactivationJob(): Promise<{
  processed: number;
  skipped: number;
  errors: string[];
}> {
  const cooldownDate = subDays(new Date(), COOLDOWN_DAYS);
  const lostThreshold = subDays(new Date(), REACTIVATION_DAYS);

  const proUsers = await User.find({
    subscriptionTier: { $in: ["pro", "premium"] },
  }).select("_id subscriptionTier");

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of proUsers) {
    if (!canAccess(user.subscriptionTier, "automation")) continue;

    const eligibleClients = await Client.find({
      userId: user._id,
      optIn: true,
      lastVisitDate: { $lte: lostThreshold, $exists: true },
      $or: [
        { lastMessageSentDate: { $exists: false } },
        { lastMessageSentDate: null },
        { lastMessageSentDate: { $lte: cooldownDate } },
      ],
    });

    for (const client of eligibleClients) {
      try {
        await mergeDuplicateClients(user._id, client.phoneNormalized, client._id);

        const fresh = await Client.findById(client._id);
        if (!fresh) continue;

        const status = computeClientStatus(fresh.lastVisitDate);
        if (status !== "lost") {
          skipped++;
          continue;
        }

        if (!canSendAutomatedWhatsApp(fresh)) {
          skipped++;
          continue;
        }

        const message = WHATSAPP_TEMPLATES.reactivation;
        const whatsappUrl = buildWhatsAppLink(fresh.phone, message);
        const now = new Date();

        await ReactivationLog.create({
          userId: user._id,
          clientId: fresh._id,
          phone: fresh.phone,
          message,
          whatsappUrl,
          sentAt: now,
          automated: true,
        });

        fresh.lastMessageSentDate = now;
        fresh.status = "lost";
        await fresh.save();

        processed++;
      } catch (err) {
        errors.push(`Client ${client._id}: ${String(err)}`);
      }
    }
  }

  return { processed, skipped, errors };
}
