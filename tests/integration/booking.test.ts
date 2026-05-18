import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDB, clearTestDB, disconnectTestDB } from "../helpers/db";
import { seedDemoData } from "@/lib/seed/demo-seed";
import { createValidatedAppointment } from "@/lib/appointment-create";
import { SchedulingConflictError } from "@/lib/scheduling";
import { Appointment } from "@/models/Appointment";
import { pickTestSlot } from "../helpers/slots";

describe("booking flow", () => {
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
    const client = await Client.findOne({ userId });
    const service = await Service.findOne({ userId, name: "Gel Nails" });
    clientId = client!._id.toString();
    serviceId = service!._id.toString();
  });

  it("creates appointment with service duration", async () => {
    const date = await pickTestSlot(userId, 60, 15);
    const appt = await createValidatedAppointment({
      userId,
      clientId,
      date,
      serviceId,
      serviceName: "Gel Nails",
      finalPrice: 150,
    });
    expect(appt.durationMinutes).toBe(60);
    expect(appt.status).toBe("scheduled");
  });

  it("blocks double booking at same slot", async () => {
    const date = await pickTestSlot(userId, 60, 20);
    await createValidatedAppointment({
      userId,
      clientId,
      date,
      serviceId,
    });
    await expect(
      createValidatedAppointment({
        userId,
        clientId,
        date,
        serviceId,
      })
    ).rejects.toThrow(SchedulingConflictError);
  });

  it("allows adjacent non-overlapping slots", async () => {
    const base = await pickTestSlot(userId, 60, 25);
    await createValidatedAppointment({
      userId,
      clientId,
      date: base,
      serviceId,
    });
    const { getAvailableSlots } = await import("@/lib/availability");
    const { addMinutes } = await import("date-fns");
    const afterFirst = addMinutes(base, 60);
    const daySlots = await getAvailableSlots(userId, afterFirst, {
      slotDurationMinutes: 60,
    });
    const later =
      daySlots.find((s) => s.start.getTime() >= afterFirst.getTime())?.start ??
      (await pickTestSlot(userId, 60, 26));
    const second = await createValidatedAppointment({
      userId,
      clientId,
      date: later,
      serviceId,
    });
    expect(second._id).toBeDefined();
    const count = await Appointment.countDocuments({ userId, status: "scheduled" });
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
