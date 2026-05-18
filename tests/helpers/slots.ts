import { addDays } from "date-fns";
import { getAvailableSlots } from "@/lib/availability";

/** Pick a real open slot from weekly schedule (avoids closed days / past times). */
export async function pickTestSlot(
  userId: string,
  durationMinutes = 60,
  dayOffset = 10
): Promise<Date> {
  const base = new Date();
  for (let d = dayOffset; d < dayOffset + 90; d++) {
    const day = addDays(base, d);
    const slots = await getAvailableSlots(userId, day, { slotDurationMinutes: durationMinutes });
    const future = slots.find((s) => s.start.getTime() > Date.now() + 60_000);
    if (future) return future.start;
  }
  throw new Error("No open test slot found in 90 days");
}
