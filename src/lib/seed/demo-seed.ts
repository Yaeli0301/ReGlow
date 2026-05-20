import bcrypt from "bcryptjs";
import { addDays, subDays, setHours, setMinutes } from "date-fns";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { Payment } from "@/models/Payment";
import { WeeklySchedule, DEFAULT_WEEKLY } from "@/models/WeeklySchedule";
import { getOrCreateBusinessSettings } from "@/lib/business-settings";
import { upsertClientByPhone } from "@/lib/client-service";
import { buildRescheduleToken } from "@/lib/notifications";
import { logger } from "@/lib/logger";

import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_PASSWORD,
} from "@/lib/seed/demo-constants";

export {
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_PASSWORD,
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
} from "@/lib/seed/demo-constants";

const DEMO_CLIENTS = [
  { name: "מיה כהן", phone: "0501111001" },
  { name: "נועה לוי", phone: "0501111002" },
  { name: "שירה אברהם", phone: "0501111003" },
  { name: "דנה פרץ", phone: "0501111004" },
  { name: "יעל מזרחי", phone: "0501111005" },
  { name: "רונית שמש", phone: "0501111006" },
  { name: "הילה גולן", phone: "0501111007" },
  { name: "תמר בר", phone: "0501111008" },
];

const DEMO_SERVICES = [
  { name: "Gel Nails", durationMinutes: 60, basePrice: 150, addOn: { name: "עיצוב", price: 30 } },
  { name: "Pedicure", durationMinutes: 45, basePrice: 120 },
  { name: "Facial", durationMinutes: 50, basePrice: 200 },
];

export async function ensureDemoSeeded(): Promise<void> {
  const existing = await User.findOne({ email: DEMO_OWNER_EMAIL });
  if (existing) return;
  await seedDemoData({ force: false });
}

export async function seedDemoData(options: { force?: boolean } = {}): Promise<{
  userId: string;
  email: string;
  password: string;
}> {
  if (options.force) {
    await User.deleteMany({ email: { $in: [DEMO_OWNER_EMAIL, DEMO_ADMIN_EMAIL] } });
  }

  let adminUser = await User.findOne({ email: DEMO_ADMIN_EMAIL });
  if (!adminUser) {
    const adminHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);
    adminUser = await User.create({
      email: DEMO_ADMIN_EMAIL,
      password: adminHash,
      businessName: "ReGlow Admin",
      role: "admin",
      subscriptionTier: "premium",
      referralCode: `ADM${Date.now().toString(36).slice(-6)}`,
    });
    logger.info("Demo admin created", { email: DEMO_ADMIN_EMAIL });
  }

  let owner = await User.findOne({ email: DEMO_OWNER_EMAIL });
  if (!owner) {
    const hash = await bcrypt.hash(DEMO_OWNER_PASSWORD, 10);
    owner = await User.create({
      email: DEMO_OWNER_EMAIL,
      password: hash,
      businessName: "סלון דמו ReGlow",
      role: "business",
      subscriptionTier: "premium",
      referralCode: `DEMO${Date.now().toString(36).slice(-6)}`,
    });
    logger.info("Demo owner created", { email: DEMO_OWNER_EMAIL });
  }

  const userId = owner._id.toString();

  await getOrCreateBusinessSettings(userId);

  const schedule = await WeeklySchedule.findOne({ userId: owner._id });
  if (!schedule) {
    await WeeklySchedule.create({ userId: owner._id, days: DEFAULT_WEEKLY });
  }

  await Service.deleteMany({ userId: owner._id });
  const services = await Promise.all(
    DEMO_SERVICES.map((s, i) =>
      Service.create({
        userId: owner._id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        basePrice: s.basePrice,
        sortOrder: i,
        addOns: s.addOn ? [{ name: s.addOn.name, price: s.addOn.price, active: true }] : [],
      })
    )
  );

  await Client.deleteMany({ userId: owner._id });
  const clients = await Promise.all(
    DEMO_CLIENTS.map((c, i) =>
      upsertClientByPhone({
        userId: owner._id,
        name: c.name,
        phone: c.phone,
        optIn: true,
        lastVisitDate: i < 4 ? subDays(new Date(), 5 + i) : subDays(new Date(), 35 + i),
        notes: "לקוחת דמו",
      })
    )
  );

  await Appointment.deleteMany({ userId: owner._id });
  await Payment.deleteMany({ userId: owner._id });

  const now = new Date();
  const gel = services[0];
  const pedi = services[1];
  const facial = services[2];

  const upcoming = await Appointment.create({
    userId: owner._id,
    clientId: clients[0]._id,
    date: setMinutes(setHours(addDays(now, 1), 10), 0),
    status: "scheduled",
    serviceId: gel._id,
    serviceName: gel.name,
    durationMinutes: gel.durationMinutes,
    finalPrice: gel.basePrice,
    rescheduleToken: buildRescheduleToken(),
    paymentStatus: "unpaid",
  });

  await Appointment.create({
    userId: owner._id,
    clientId: clients[1]._id,
    date: setMinutes(setHours(addDays(now, 2), 14), 30),
    status: "scheduled",
    serviceId: pedi._id,
    serviceName: pedi.name,
    durationMinutes: pedi.durationMinutes,
    finalPrice: pedi.basePrice,
    rescheduleToken: buildRescheduleToken(),
    paymentStatus: "unpaid",
  });

  const completedAppt = await Appointment.create({
    userId: owner._id,
    clientId: clients[2]._id,
    date: subDays(setMinutes(setHours(now, 11), 0), 3),
    status: "completed",
    serviceId: facial._id,
    serviceName: facial.name,
    durationMinutes: facial.durationMinutes,
    finalPrice: facial.basePrice,
    priceLineItems: [{ label: facial.name, amount: facial.basePrice }],
    paymentStatus: "paid",
    rescheduleToken: buildRescheduleToken(),
  });

  await Payment.create({
    userId: owner._id,
    appointmentId: completedAppt._id,
    clientId: clients[2]._id,
    method: "card",
    amount: facial.basePrice,
    status: "paid",
    confirmedAt: subDays(now, 3),
  });

  const cashAppt = await Appointment.create({
    userId: owner._id,
    clientId: clients[3]._id,
    date: subDays(setMinutes(setHours(now, 16), 0), 1),
    status: "completed",
    serviceId: gel._id,
    serviceName: gel.name,
    durationMinutes: gel.durationMinutes,
    finalPrice: gel.basePrice,
    paymentStatus: "pending_cash",
    rescheduleToken: buildRescheduleToken(),
  });

  await Payment.create({
    userId: owner._id,
    appointmentId: cashAppt._id,
    clientId: clients[3]._id,
    method: "cash",
    amount: gel.basePrice,
    status: "pending",
  });

  await Appointment.create({
    userId: owner._id,
    clientId: clients[4]._id,
    date: addDays(now, -2),
    status: "canceled",
    serviceId: pedi._id,
    serviceName: pedi.name,
    durationMinutes: pedi.durationMinutes,
    canceledAt: addDays(now, -2),
    cancelReason: "לקוחה ביטלה",
    rescheduleToken: buildRescheduleToken(),
    paymentStatus: "unpaid",
  });

  logger.info("Demo seed complete", {
    userId,
    services: services.length,
    clients: clients.length,
    upcoming: upcoming._id.toString(),
  });

  return { userId, email: DEMO_OWNER_EMAIL, password: DEMO_OWNER_PASSWORD };
}
