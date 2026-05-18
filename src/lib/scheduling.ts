import { addMinutes, format, startOfDay } from "date-fns";
import { resolveServiceDuration } from "@/lib/service-duration";
import { getAvailableSlots, type TimeSlot } from "@/lib/availability";

export { resolveServiceDuration };

export class SchedulingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulingConflictError";
  }
}

/** Check if [start, start+duration) overlaps any non-canceled appointment. */
export async function isSlotAvailable(
  userId: string,
  start: Date,
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const slots = await getAvailableSlots(userId, start, {
    slotDurationMinutes: durationMinutes,
    excludeAppointmentId,
  });
  const targetLabel = format(start, "HH:mm");
  return slots.some(
    (s) => Math.abs(s.start.getTime() - start.getTime()) < 60_000 || s.label === targetLabel
  );
}

export async function assertSlotAvailable(
  userId: string,
  start: Date,
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<void> {
  const ok = await isSlotAvailable(userId, start, durationMinutes, excludeAppointmentId);
  if (!ok) {
    throw new SchedulingConflictError("השעה אינה פנויה או חופפת לתור קיים");
  }
}

export async function getNearestAvailableSlots(
  userId: string,
  referenceDate: Date,
  durationMinutes: number,
  count = 3,
  serviceId?: string
): Promise<TimeSlot[]> {
  const duration = serviceId
    ? await resolveServiceDuration(userId, serviceId)
    : durationMinutes;

  const found: TimeSlot[] = [];
  const dayCursor = new Date(referenceDate);
  dayCursor.setHours(0, 0, 0, 0);

  for (let d = 0; d < 21 && found.length < count; d++) {
    const day = addMinutes(dayCursor, d * 24 * 60);
    const slots = await getAvailableSlots(userId, day, {
      slotDurationMinutes: duration,
    });
    for (const slot of slots) {
      if (slot.start <= referenceDate && d === 0) continue;
      found.push(slot);
      if (found.length >= count) break;
    }
  }

  return found.slice(0, count);
}
