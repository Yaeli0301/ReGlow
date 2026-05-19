/**
 * Insights Engine — turns raw analytics into:
 *   - alerts (something is wrong)
 *   - insights (what is happening)
 *   - recommendations (what to do)
 *
 * Cron-only: never run from API hot paths.
 * Idempotent: upserts by (metric, period, periodKey) so re-running same day
 * updates the same insight instead of creating duplicates.
 */

import { connectDB } from "@/lib/mongodb";
import { Insight, type IInsight, type InsightPeriod, type InsightSeverity, type InsightType } from "@/models/Insight";
import {
  getDailyMetrics,
  getWeeklyMetrics,
  getMonthlyMetrics,
  DAY_MS,
  WEEK_MS,
  startOfDay,
  startOfWeek,
  startOfMonth,
} from "@/lib/analytics/metrics-service";
import { Event } from "@/models/Event";
import { logger } from "@/lib/logger";

export interface InsightDraft {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  metric: string;
  delta?: number;
  period: InsightPeriod;
  recommendation?: string;
  meta?: Record<string, unknown>;
}

/* ---------------------------------------------------------------------------
 * THRESHOLDS — tunable from one place
 * ------------------------------------------------------------------------- */
export const THRESHOLDS = {
  usageDropPct: 15,
  retention7dMin: 40,
  mrrDropPct: 10,
  apptsPerActiveDropPct: 20,
  newUsersGrowthPct: 25,
  activationRatioMin: 0.5, // newUsers who logged in again same week / newUsers
  minSampleSize: 3, // skip detection when too few users — avoids noise on day 1
} as const;

/* ---------------------------------------------------------------------------
 * PERIOD KEYS (used for dedupe)
 * ------------------------------------------------------------------------- */
export function periodKeyFor(period: InsightPeriod, ref: Date = new Date()): string {
  if (period === "daily") return startOfDay(ref).toISOString().slice(0, 10);
  if (period === "weekly") return startOfWeek(ref).toISOString().slice(0, 10);
  return startOfMonth(ref).toISOString().slice(0, 7);
}

function pctChange(curr: number, prev: number): number {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/* ---------------------------------------------------------------------------
 * DETECTION RULES
 * ------------------------------------------------------------------------- */

export async function detectDailyInsights(now: Date = new Date()): Promise<InsightDraft[]> {
  const drafts: InsightDraft[] = [];
  const yesterday = new Date(now.getTime() - DAY_MS);

  const [today, prev] = await Promise.all([
    getDailyMetrics(now),
    getDailyMetrics(yesterday),
  ]);

  // 🟢 Usage drop
  if (prev.activeUsers >= THRESHOLDS.minSampleSize) {
    const delta = pctChange(today.activeUsers, prev.activeUsers);
    if (delta <= -THRESHOLDS.usageDropPct) {
      drafts.push({
        type: "alert",
        severity: Math.abs(delta) >= 30 ? "high" : "medium",
        title: "ירידה בשימוש במערכת",
        message: `מספר המשתמשות הפעילות ירד ב-${Math.abs(delta)}% (${prev.activeUsers} → ${today.activeUsers}).`,
        metric: "activeUsers",
        delta,
        period: "daily",
        recommendation:
          "שלחי קמפיין re-engagement ב-WhatsApp/אימייל למשתמשות שלא נכנסו השבוע. בדקי האם הייתה הפסקת שירות.",
        meta: { today: today.activeUsers, prev: prev.activeUsers },
      });
    }
  }

  // Engagement: appointments per active user
  if (today.activeUsers >= THRESHOLDS.minSampleSize && prev.activeUsers >= THRESHOLDS.minSampleSize) {
    const todayRatio = today.appointmentsCreated / Math.max(today.activeUsers, 1);
    const prevRatio = prev.appointmentsCreated / Math.max(prev.activeUsers, 1);
    if (prevRatio > 0) {
      const delta = pctChange(todayRatio, prevRatio);
      if (delta <= -THRESHOLDS.apptsPerActiveDropPct) {
        drafts.push({
          type: "insight",
          severity: "medium",
          title: "ירידה בשימוש ביומן התורים",
          message: `יחס תורים-למשתמשת-פעילה ירד ב-${Math.abs(delta)}% (${prevRatio.toFixed(2)} → ${todayRatio.toFixed(2)}).`,
          metric: "appointmentsPerActive",
          delta,
          period: "daily",
          recommendation:
            "הוסיפי תזכורת/onboarding ליצירת תור ראשון. שקלי טמפלייט WhatsApp להוספה מהירה.",
          meta: { todayRatio, prevRatio },
        });
      }
    }
  }

  // Zero appointments today (only when yesterday had some)
  if (today.appointmentsCreated === 0 && prev.appointmentsCreated > 0) {
    drafts.push({
      type: "alert",
      severity: "medium",
      title: "אין תורים חדשים היום",
      message: `אתמול נוצרו ${prev.appointmentsCreated} תורים, היום 0.`,
      metric: "appointmentsCreated",
      delta: -100,
      period: "daily",
      recommendation: "בדקי את דף ההזמנות הציבורי + שלחי תזכורת ללקוחות לקבוע תור.",
      meta: { today: 0, prev: prev.appointmentsCreated },
    });
  }

  return drafts;
}

export async function detectWeeklyInsights(now: Date = new Date()): Promise<InsightDraft[]> {
  const drafts: InsightDraft[] = [];

  const currWeekly = await getWeeklyMetrics(now);
  const prevWeekly = await getWeeklyMetrics(new Date(now.getTime() - WEEK_MS));

  // 🟡 Retention problem
  if (currWeekly.retentionRate7d > 0 && currWeekly.retentionRate7d < THRESHOLDS.retention7dMin) {
    drafts.push({
      type: "insight",
      severity: currWeekly.retentionRate7d < 20 ? "high" : "medium",
      title: "משתמשים לא חוזרים למערכת אחרי שימוש ראשון",
      message: `Retention 7 ימים: ${currWeekly.retentionRate7d}% — מתחת לסף הבריא (${THRESHOLDS.retention7dMin}%).`,
      metric: "retention7d",
      delta: currWeekly.retentionRate7d,
      period: "weekly",
      recommendation:
        "שיפור תהליך ה-onboarding נדרש — הוסיפי tooltip של 'התור הראשון' ושלחי מייל יומיים אחרי הרשמה.",
      meta: { retention: currWeekly.retentionRate7d, threshold: THRESHOLDS.retention7dMin },
    });
  }

  // Churn high
  if (currWeekly.churnRate >= 5) {
    drafts.push({
      type: "alert",
      severity: currWeekly.churnRate >= 10 ? "high" : "medium",
      title: "שיעור נטישה גבוה",
      message: `${currWeekly.churnRate}% מהמנויות בתשלום ביטלו השבוע.`,
      metric: "churnRate",
      delta: currWeekly.churnRate,
      period: "weekly",
      recommendation:
        "בצעי exit-survey לכל מנויה שביטלה ב-7 ימים האחרונים. שקלי הנחה שמירה.",
      meta: { churn: currWeekly.churnRate },
    });
  }

  // 🟣 Growth opportunity — many new users but low activation
  const newUsers = currWeekly.newUsers;
  if (newUsers >= THRESHOLDS.minSampleSize) {
    const activations = await countActivatedUsers(now);
    const ratio = activations / newUsers;
    if (ratio < THRESHOLDS.activationRatioMin) {
      drafts.push({
        type: "recommendation",
        severity: "medium",
        title: "תהליך onboarding דורש שיפור",
        message: `${newUsers} נרשמו השבוע, רק ${activations} (${Math.round(ratio * 100)}%) חזרו לפעולה משמעותית.`,
        metric: "activationRatio",
        delta: Math.round(ratio * 100),
        period: "weekly",
        recommendation:
          "שיפור onboarding יכול להעלות שימוש ב-20–30%. הוסיפי checklist מודרך וסרטון של 30 שניות.",
        meta: { newUsers, activations, ratio },
      });
    }
  }

  // Growth surge — positive recommendation
  const newUsersDelta = pctChange(currWeekly.newUsers, prevWeekly.newUsers);
  if (newUsersDelta >= THRESHOLDS.newUsersGrowthPct && currWeekly.newUsers >= THRESHOLDS.minSampleSize) {
    drafts.push({
      type: "recommendation",
      severity: "low",
      title: "צמיחה חזקה במשתמשות חדשות",
      message: `+${newUsersDelta}% משתמשות חדשות לעומת השבוע שעבר (${prevWeekly.newUsers} → ${currWeekly.newUsers}).`,
      metric: "newUsersGrowth",
      delta: newUsersDelta,
      period: "weekly",
      recommendation:
        "ודאי שצוות התמיכה ערוך לעומס, ושקלי לשפר תהליך הצ'קאאוט לפני שהצמיחה ממשיכה.",
      meta: { newUsers: currWeekly.newUsers, prev: prevWeekly.newUsers },
    });
  }

  return drafts;
}

export async function detectMonthlyInsights(now: Date = new Date()): Promise<InsightDraft[]> {
  const drafts: InsightDraft[] = [];

  const curr = await getMonthlyMetrics(now);
  const prevDate = new Date(now);
  prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
  const prev = await getMonthlyMetrics(prevDate);

  // 🔴 Revenue risk
  if (prev.MRR > 0) {
    const delta = pctChange(curr.MRR, prev.MRR);
    if (delta <= -THRESHOLDS.mrrDropPct) {
      drafts.push({
        type: "alert",
        severity: Math.abs(delta) >= 25 ? "high" : "medium",
        title: "ירידה בהכנסות החודשיות",
        message: `MRR ירד ב-${Math.abs(delta)}% (₪${prev.MRR} → ₪${curr.MRR}).`,
        metric: "MRR",
        delta,
        period: "monthly",
        recommendation:
          "סקרי את רשימת המנויות שביטלו החודש. שלחי הצעת חזרה עם הנחה ל-30 ימים.",
        meta: { currMRR: curr.MRR, prevMRR: prev.MRR },
      });
    } else if (delta >= 15) {
      drafts.push({
        type: "recommendation",
        severity: "low",
        title: "צמיחה חזקה ב-MRR",
        message: `MRR עלה ב-${delta}% (₪${prev.MRR} → ₪${curr.MRR}).`,
        metric: "MRR",
        delta,
        period: "monthly",
        recommendation: "שקלי להעלות מחיר ב-Premium או לפתוח Tier חדש.",
      });
    }
  }

  return drafts;
}

/** How many users who signed up this week also did something meaningful afterwards. */
async function countActivatedUsers(now: Date): Promise<number> {
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart.getTime() + WEEK_MS);

  // Users who triggered ANY post-signup event this week (not just the signup itself)
  const rows = await Event.aggregate([
    {
      $match: {
        type: { $in: ["client_created", "appointment_created", "booking_created"] },
        createdAt: { $gte: weekStart, $lt: weekEnd },
      },
    },
    { $group: { _id: "$userId" } },
  ]);

  return rows.length;
}

/* ---------------------------------------------------------------------------
 * STORAGE — upsert, dedupe, return what's actually new
 * ------------------------------------------------------------------------- */

export interface StoreResult {
  total: number;
  created: IInsight[];
  updated: number;
}

export async function storeInsights(
  drafts: InsightDraft[],
  now: Date = new Date()
): Promise<StoreResult> {
  await connectDB();
  const created: IInsight[] = [];
  let updated = 0;

  for (const draft of drafts) {
    const periodKey = periodKeyFor(draft.period, now);
    try {
      const existing = await Insight.findOne({
        metric: draft.metric,
        period: draft.period,
        periodKey,
      });

      if (existing) {
        existing.title = draft.title;
        existing.message = draft.message;
        existing.severity = draft.severity;
        existing.delta = draft.delta;
        existing.recommendation = draft.recommendation;
        existing.meta = draft.meta;
        existing.type = draft.type;
        await existing.save();
        updated++;
        continue;
      }

      const doc = await Insight.create({
        ...draft,
        periodKey,
        resolved: false,
      });
      created.push(doc);
    } catch (error) {
      // Concurrent runs could race on the unique index — swallow & log
      logger.warn("storeInsights skipped duplicate", {
        metric: draft.metric,
        err: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { total: drafts.length, created, updated };
}

/* ---------------------------------------------------------------------------
 * QUERY HELPERS (for UI)
 * ------------------------------------------------------------------------- */

export async function getActiveInsights(filter: {
  period?: InsightPeriod;
  type?: InsightType;
  limit?: number;
} = {}): Promise<IInsight[]> {
  await connectDB();
  const query: Record<string, unknown> = { resolved: false };
  if (filter.period) query.period = filter.period;
  if (filter.type) query.type = filter.type;

  return Insight.find(query)
    .sort({ severity: -1, createdAt: -1 })
    .limit(filter.limit ?? 50)
    .lean();
}

export async function resolveInsight(
  id: string,
  adminId: string
): Promise<IInsight | null> {
  await connectDB();
  return Insight.findByIdAndUpdate(
    id,
    { resolved: true, resolvedAt: new Date(), resolvedBy: adminId },
    { new: true }
  );
}

/* ---------------------------------------------------------------------------
 * TOP-LEVEL RUNNERS
 * ------------------------------------------------------------------------- */

export async function runAllInsights(now: Date = new Date()): Promise<{
  daily: StoreResult;
  weekly: StoreResult;
  monthly: StoreResult;
  newHighSeverity: IInsight[];
}> {
  const [dailyDrafts, weeklyDrafts, monthlyDrafts] = await Promise.all([
    detectDailyInsights(now),
    detectWeeklyInsights(now),
    detectMonthlyInsights(now),
  ]);

  const [daily, weekly, monthly] = await Promise.all([
    storeInsights(dailyDrafts, now),
    storeInsights(weeklyDrafts, now),
    storeInsights(monthlyDrafts, now),
  ]);

  const newHighSeverity = [
    ...daily.created,
    ...weekly.created,
    ...monthly.created,
  ].filter((i) => i.severity === "high");

  return { daily, weekly, monthly, newHighSeverity };
}

/* ---------------------------------------------------------------------------
 * INSTANT TRIGGER — call from a critical handler (e.g. payment failure spike)
 * ------------------------------------------------------------------------- */

export async function emitInstantInsight(draft: InsightDraft): Promise<IInsight | null> {
  const now = new Date();
  const periodKey = periodKeyFor(draft.period, now);
  try {
    await connectDB();
    const existing = await Insight.findOne({
      metric: draft.metric,
      period: draft.period,
      periodKey,
    });
    if (existing) {
      existing.severity = draft.severity;
      existing.message = draft.message;
      await existing.save();
      return existing;
    }
    return await Insight.create({ ...draft, periodKey, resolved: false });
  } catch (error) {
    logger.warn("emitInstantInsight failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
