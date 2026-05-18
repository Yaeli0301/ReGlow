# ReGlow — מערכת הפעלה לסלוני קוסמטיקה

פלטפורמת SaaS לניהול עסק מלא: תורים חכמים, שימור לקוחות, ביטולים, תשלומים, חשבוניות ואנליטיקה.

## Tech stack

- **Next.js 15** (App Router) + TypeScript
- **MongoDB** + Mongoose
- **Tailwind CSS** — RTL / עברית
- **Stripe** — מנויים
- **JWT** — אימות (`reglow_token` cookie)

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # מלאי MONGODB_URI, JWT_SECRET, Stripe וכו'
npm run dev:clean              # מומלץ אחרי שגיאות .next
```

פתחי `http://localhost:3000`

```bash
npm run build
npm test                 # unit + integration (Vitest)
npm run test:unit
npm run test:integration
npm run test:smoke
```

## Environment modes

| `ENV_MODE` | Behavior |
|------------|----------|
| `production` | Real `MONGODB_URI`, Stripe, persistent data |
| `demo` | Demo banner, auto-seed, reset API; local: in-memory Mongo if no URI |

```bash
# Local demo (no Mongo install needed)
ENV_MODE=demo npm run dev

# Demo with dedicated DB
ENV_MODE=demo MONGODB_URI_DEMO=mongodb://... npm run dev

# Reset demo data
curl -X POST http://localhost:3000/api/demo/reset
```

**Demo login:** `demo@reglow.local` / `Demo1234!`

Never point `MONGODB_URI` and `MONGODB_URI_DEMO` at the same production database.

## מודולים עיקריים

| מודול | תיאור |
|--------|--------|
| **Smart scheduling** | `src/lib/scheduling.ts`, `availability.ts` — מניעת חפיפות לפי משך שירות |
| **Retention engine** | `src/lib/retention-engine.ts` — הודעות 30–45 יום + fallback אוטומטי (cron) |
| **Cancel / reschedule** | `POST /api/appointments/[id]/cancel`, `/api/reschedule/[token]` |
| **Payments & invoices** | מזומן, כרטיס, Bit, PayPal; ייצוא PDF/ZIP חודשי |
| **Analytics** | `GET /api/dashboard/stats` — הכנסה מלקוחות חוזרות, churn, פעילים |
| **Feedback** | `/feedback`, `/admin/feedback` (role: `admin`) |
| **RBAC** | `business` / `admin` — בידוד נתונים לפי `userId` |

## Cron (Vercel)

`vercel.json`:

- `0 8 * * *` → `/api/cron/reactivate`
- `0 * * * *` → `/api/cron/retention`

דרוש header: `Authorization: Bearer $CRON_SECRET`

## משתנה סביבה חשובים

- `MONGODB_URI`, `JWT_SECRET`
- `CRON_SECRET`
- `STRIPE_*`, `NEXT_PUBLIC_APP_URL`
- WhatsApp: כרגע קישורי `wa.me` (לא API רשמי)

## הגדרת אדמין

ב-MongoDB: `db.users.updateOne({ email: "..." }, { $set: { role: "admin" } })`

## מנויים

- **Basic** — לקוחות + דשבורד
- **Pro** — יומן, אוטומציה, לקוחות אבודים
- **Premium** — דף הזמנה `/book/[businessId]`

## קישורים ללקוחות

- הזמנה: `/book/{businessId}`
- שינוי מועד (אחרי ביטול): `/reschedule/{rescheduleToken}`
