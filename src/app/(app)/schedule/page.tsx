"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { format, addDays } from "date-fns";

interface DaySchedule {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function SchedulePage() {
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [slotDuration, setSlotDuration] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [overrideDate, setOverrideDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [overrideClosed, setOverrideClosed] = useState(false);
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/availability/weekly")
      .then(async (res) => {
        if (res.status === 403) {
          setLocked(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.schedule) {
          setDays(data.schedule.days);
          setSlotDuration(data.schedule.slotDurationMinutes || 30);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function updateDay(index: number, patch: Partial<DaySchedule>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function saveWeekly() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/availability/weekly", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, slotDurationMinutes: slotDuration }),
    });
    setSaving(false);
    setMessage(res.ok ? "נשמר בהצלחה ✓" : "שגיאה בשמירה");
  }

  async function saveOverride() {
    setMessage("");
    const blockedSlots = overrideClosed ? [] : [{ startTime: blockStart, endTime: blockEnd }];

    const res = await fetch("/api/availability/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: overrideDate,
        isClosed: overrideClosed,
        blockedSlots,
        note: overrideClosed ? "סגור" : "חסימת שעות",
      }),
    });
    setMessage(res.ok ? "עדכון תאריך נשמר ✓" : "שגיאה");
  }

  if (loading) return <p className="text-gray-500">טוען...</p>;

  if (locked) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold">נדרש מנוי Pro</h1>
        <a href="/billing" className="btn-primary mt-4 inline-block">
          שדרוג
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">זמינות ושעות עבודה</h1>
      <p className="mt-1 text-gray-500">ההזמנות האונליין יוצגו רק בשעות הפנויות</p>

      {message && (
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-700">{message}</p>
      )}

      <div className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-semibold">שעות שבועיות</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">משך תור (דק׳)</label>
            <select
              className="input w-24"
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
            >
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {days.map((day, i) => (
            <div
              key={day.dayOfWeek}
              className={`flex flex-wrap items-center gap-3 rounded-xl p-3 ${
                day.isOpen ? "bg-white" : "bg-gray-50"
              }`}
            >
              <label className="flex w-24 items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  onChange={(e) => updateDay(i, { isOpen: e.target.checked })}
                  className="rounded text-brand-500"
                />
                <span className="text-sm font-medium">{DAY_NAMES[day.dayOfWeek]}</span>
              </label>
              {day.isOpen ? (
                <>
                  <input
                    type="time"
                    className="input w-32"
                    value={day.startTime}
                    onChange={(e) => updateDay(i, { startTime: e.target.value })}
                  />
                  <span className="text-gray-400">עד</span>
                  <input
                    type="time"
                    className="input w-32"
                    value={day.endTime}
                    onChange={(e) => updateDay(i, { endTime: e.target.value })}
                  />
                </>
              ) : (
                <span className="text-sm text-gray-400">סגור</span>
              )}
            </div>
          ))}
        </div>

        <Button className="mt-4" onClick={saveWeekly} loading={saving}>
          שמירת שעות שבועיות
        </Button>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold">חסימת תאריך / שעות</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="תאריך" type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={overrideClosed} onChange={(e) => setOverrideClosed(e.target.checked)} />
            <span className="text-sm">יום סגור לחלוטין</span>
          </label>
          {!overrideClosed && (
            <>
              <Input label="חסום מ-" type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
              <Input label="עד" type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
            </>
          )}
        </div>
        <Button variant="secondary" className="mt-4" onClick={saveOverride}>
          שמירת חסימה
        </Button>
      </div>
    </div>
  );
}
