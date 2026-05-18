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

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string; // "10:00"
}

function parseTimeOnDate(date: Date, time: string): Date {
  const base = startOfDay(date);
  return parse(time, "HH:mm", base);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
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
  options?: { excludeAppointmentId?: string }
): Promise<TimeSlot[]> {
  const schedule = await getOrCreateWeeklySchedule(userId);
  const dayStart = startOfDay(date);
  const dayOfWeek = date.getDay();

  const override = await DateOverride.findOne({
    userId,
    date: dayStart,
  });

  const config = getDayConfig(dayOfWeek, schedule.days, override);
  if (!config) return [];

  const duration = schedule.slotDurationMinutes;
  const rangeStart = parseTimeOnDate(date, config.startTime);
  const rangeEnd = parseTimeOnDate(date, config.endTime);

  const appointments = await Appointment.find({
    userId,
    date: {
      $gte: dayStart,
      $lt: addMinutes(dayStart, 24 * 60),
    },
    status: { $ne: "canceled" },
    ...(options?.excludeAppointmentId
      ? { _id: { $ne: options.excludeAppointmentId } }
      : {}),
  }).select("date");

  const bookedRanges = appointments.map((a) => {
    const start = new Date(a.date);
    return {
      start: timeToMinutes(format(start, "HH:mm")),
      end: timeToMinutes(format(addMinutes(start, duration), "HH:mm")),
    };
  });

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
