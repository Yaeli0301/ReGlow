import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import { seedDemoData } from "@/lib/seed/demo-seed";
import { createValidatedAppointment } from "@/lib/appointment-create";
import { getNearestAvailableSlots } from "@/lib/scheduling";
import { Appointment } from "@/models/Appointment";
import { pickTestSlot } from "../helpers/slots";

describe("cancellation → reschedule flow", () => {
  let userId: string;
  let clientId: string;
  let serviceId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const seed = await seedDemoData({ force: true });
    userId = seed.userId;
    const { Client } = await import("@/models/Client");
    const { Service } = await import("@/models/Service");
    clientId = (await Client.findOne({ userId }))!._id.toString();
    serviceId = (await Service.findOne({ userId, name: "Pedicure" }))!._id.toString();
  });

  it("cancels appointment and suggests alternatives", async () => {
    const date = await pickTestSlot(userId, 45, 18);
    const appt = await createValidatedAppointment({
      userId,
      clientId,
      date,
      serviceId,
    });

    appt.status = "canceled";
    appt.canceledAt = new Date();
    await appt.save();

    const alternatives = await getNearestAvailableSlots(userId, date, 45, 3, serviceId);
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.length).toBeLessThanOrEqual(3);

    const updated = await Appointment.findById(appt._id);
    expect(updated?.status).toBe("canceled");
  });
});
