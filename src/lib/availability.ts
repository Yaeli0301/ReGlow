import {
  addMinutes,
  format,
  parse,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";
import { WeeklySchedule, DEFAULT_WEEKLY, type IDaySchedule } from "@/models/WeeklySchedule";
import { DateOverride, type IBlockedSlot } from "@/models/DateOverride";
import { Appointment } from "@/models/Appointment";
import { resolveServiceDuration } from "@/lib/service-duration";

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

export interface GetSlotsOptions {
  excludeAppointmentId?: string;
  slotDurationMinutes?: number;
}

function parseTimeOnDate(date: Date, time: string): Date {
  const base = startOfDay(date);
  return parse(time, "HH:mm", base);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isSlotBlocked(
  slotStart: number,
  slotEnd: number,
  blocked: IBlockedSlot[]
): boolean {
  return blocked.some((b) =>
    rangesOverlap(slotStart, slotEnd, timeToMinutes(b.startTime), timeToMinutes(b.endTime))
  );
}

/** Booked minute ranges per appointment duration (smart scheduling). */
export async function getBookedRangesForDay(
  userId: string,
  dayStart: Date,
  excludeAppointmentId?: string
): Promise<Array<{ start: number; end: number }>> {
  const appointments = await Appointment.find({
    userId,
    date: {
      $gte: dayStart,
      $lt: addMinutes(dayStart, 24 * 60),
    },
    status: { $ne: "canceled" },
    ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
  }).select("date durationMinutes serviceId");

  const ranges: Array<{ start: number; end: number }> = [];

  for (const a of appointments) {
    let dur = a.durationMinutes || 60;
    if (!a.durationMinutes && a.serviceId) {
      dur = await resolveServiceDuration(userId, a.serviceId.toString());
    }
    const start = new Date(a.date);
    const startMin = timeToMinutes(format(start, "HH:mm"));
    ranges.push({ start: startMin, end: startMin + dur });
  }

  return ranges;
}

export async function getOrCreateWeeklySchedule(userId: string) {
  let schedule = await WeeklySchedule.findOne({ userId });
  if (!schedule) {
    schedule = await WeeklySchedule.create({
      userId,
      days: DEFAULT_WEEKLY,
      slotDurationMinutes: 30,
    });
  }
  return schedule;
}

export function getDayConfig(
  dayOfWeek: number,
  weeklyDays: IDaySchedule[],
  override: Awaited<ReturnType<typeof DateOverride.findOne>>
): { isOpen: boolean; startTime: string; endTime: string; blockedSlots: IBlockedSlot[] } | null {
  if (override?.isClosed) return null;

  const weekly = weeklyDays.find((d) => d.dayOfWeek === dayOfWeek);
  if (!weekly) return null;

  if (override) {
    return {
      isOpen: true,
      startTime: override.startTime || weekly.startTime,
      endTime: override.endTime || weekly.endTime,
      blockedSlots: override.blockedSlots || [],
    };
  }

  if (!weekly.isOpen) return null;

  return {
    isOpen: true,
    startTime: weekly.startTime,
    endTime: weekly.endTime,
    blockedSlots: [],
  };
}

export async function getAvailableSlots(
  userId: string,
  date: Date,
  options?: GetSlotsOptions
): Promise<TimeSlot[]> {
  const schedule = await getOrCreateWeeklySchedule(userId);
  const dayStart = startOfDay(date);
  const dayOfWeek = date.getDay();

  const override = await DateOverride.findOne({ userId, date: dayStart });
  const config = getDayConfig(dayOfWeek, schedule.days, override);
  if (!config) return [];

  const duration = options?.slotDurationMinutes ?? schedule.slotDurationMinutes;
  const rangeStart = parseTimeOnDate(date, config.startTime);
  const rangeEnd = parseTimeOnDate(date, config.endTime);

  const bookedRanges = await getBookedRangesForDay(
    userId,
    dayStart,
    options?.excludeAppointmentId
  );

  const slots: TimeSlot[] = [];
  let cursor = rangeStart;
  const now = new Date();

  while (isBefore(cursor, rangeEnd)) {
    const slotEnd = addMinutes(cursor, duration);
    if (isAfter(slotEnd, rangeEnd)) break;

    const slotStartMin = timeToMinutes(format(cursor, "HH:mm"));
    const slotEndMin = timeToMinutes(format(slotEnd, "HH:mm"));

    const blocked = isSlotBlocked(slotStartMin, slotEndMin, config.blockedSlots);
    const booked = bookedRanges.some((b) =>
      rangesOverlap(slotStartMin, slotEndMin, b.start, b.end)
    );
    const inPast = isBefore(slotEnd, now);

    if (!blocked && !booked && !inPast) {
      slots.push({
        start: new Date(cursor),
        end: slotEnd,
        label: format(cursor, "HH:mm"),
      });
    }

    cursor = slotEnd;
  }

  return slots;
}
