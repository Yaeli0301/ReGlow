# Vercel + MongoDB Atlas — ReGlow

Production URL: **https://re-glow-vhp6.vercel.app**

> **לא צריך** `npx create-next-app --example with-mongodb` — זה מדריך לאפליקציה חדשה.  
> **ReGlow כבר מחובר** ל-Mongoose; אחרי חיבור DB ב-Vercel Dashboard עשי רק את השלבים למטה.

## אם חיברת MongoDB ב-Vercel (Integration)

האינטגרציה מזריקה אוטומטית את `MONGODB_URI` ל-Project Settings → Environment Variables.

> ⚠ **חשוב**: ה-URI מהאינטגרציה מסתיים ב-`/?retryWrites=...` (בלי שם DB).  
> ReGlow מוסיף `dbName: "reglow"` אוטומטית (ראי `src/lib/mongodb.ts`), אבל **רצוי** להוסיף `/reglow` לפני `?` ב-URI ב-Vercel — קריא יותר וברור איפה הנתונים יושבים.

לדוגמה, אם האינטגרציה הגדירה:

```text
mongodb+srv://Vercel-Admin-ReGlow:***@reglow.bvaoqjq.mongodb.net/?retryWrites=true&w=majority
```

עדיף לערוך ל:

```text
mongodb+srv://Vercel-Admin-ReGlow:***@reglow.bvaoqjq.mongodb.net/reglow?retryWrites=true&w=majority
```

ReGlow כולל כבר `attachDatabasePool` מ-`@vercel/functions` ב-`src/lib/mongodb.ts` (מומלץ ל-Vercel).

## 1. MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access** → ודאי `0.0.0.0/0` (האינטגרציה מוסיפה אוטומטית את ה-IPs של Vercel)
2. **Database Access** → ודאי שמשתמש האינטגרציה (`Vercel-Admin-ReGlow`) קיים עם הרשאות `readWrite`
3. אם את לא משתמשת באינטגרציה — צרי משתמש משלך והשתמשי במחרוזת:

```text
mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/reglow?retryWrites=true&w=majority
```

## 2. Vercel — Environment Variables

[Vercel Dashboard](https://vercel.com) → הפרויקט → **Settings** → **Environment Variables**

הוסיפי לכל הסביבות: **Production**, **Preview**, **Development**

| Key | Value |
|-----|--------|
| `MONGODB_URI` | מחרוזת Atlas לפרודקשן בלבד (רצוי עם `/reglow`) — **לא** `MONGODB_URI_DEMO` |
| `JWT_SECRET` | מחרוזת אקראית 32+ תווים (שונה ממקומי!) |
| `ENV_MODE` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://re-glow-vhp6.vercel.app` |
| `CRON_SECRET` | מחרוזת אקראית 16+ תווים |

**אל תגדירי** `ENABLE_LANDING_DEMO` בפרויקט הזה. הדמו רץ בפרויקט Vercel **נפרד**.

Analytics + דוחות (אופציונלי, מומלץ):

| Key | Value |
|-----|--------|
| `ADMIN_EMAIL` | האימייל שלך — לקבלת דוחות יומיים/שבועיים |
| `RESEND_API_KEY` | מ-[resend.com](https://resend.com) — בלי המפתח, הדוחות יירשמו ללוג בלבד |
| `ADMIN_EMAIL_FROM` | `ReGlow Reports <onboarding@resend.dev>` (ברירת מחדל) |

יצירת סודות: `npm run secrets:generate`

Stripe (כשמוכן):

| Key | Value |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_PRICE_BASIC` | `price_...` |
| `STRIPE_PRICE_PRO` | `price_...` |
| `STRIPE_PRICE_PREMIUM` | `price_...` |

**Save** → **Deployments** → פריסה **חדשה** מ-`main` (Redeploy על פריסה קיימת לא ידחוף קוד חדש מ-Git).

### ארכיטקטורה: פרודקשן + דמו נפרדים

| פרויקט | תפקיד | ENV |
|--------|--------|-----|
| **ReGlow (זה)** | לקוחות אמיתיים, הרשמה, תשלום | `ENV_MODE=production`, `MONGODB_URI` |
| **ReGlow Demo** (Vercel נפרד) | הדגמה בלבד | `ENV_MODE=demo`, `MONGODB_URI_DEMO` |
| **דף נחיתה חיצוני** (Wix וכו') | שיווק + כפתור דמו | מקשר לכתובת **פרויקט הדמו** |

**באתר הפרודקשן (`/`):** רק הרשמה והתחברות — **בלי דמו**.

**בדף הנחיתה החיצוני:** כפתור "נסו דמו" →  
`https://<your-demo-project>.vercel.app/demo/start?plan=pro`

**הרשמה אמיתית:**  
`https://re-glow-vhp6.vercel.app/register`

## 3. בדיקה אחרי Redeploy

### בדיקת הגדרות (ללא סודות)

```text
https://re-glow-vhp6.vercel.app/api/setup/status
```

צריך:

```json
{
  "envMode": "production",
  "deploy": { "commit": "...", "ref": "main" },
  "checks": {
    "mongo": true,
    "jwt": true,
    "cron": true,
    "landingDemo": true
  }
}
```

### בדיקת חיבור DB

```text
https://re-glow-vhp6.vercel.app/api/health
```

צריך:

```json
{
  "status": "healthy",
  "checks": { "env_jwt": "ok", "env_mongo": "ok", "database": "ok" }
}
```

אם `database: error` — בדקי IP ב-Atlas, את ה-URI, ושמשתמש ה-DB קיים עם הסיסמה הנכונה.

## 4. יצירת משתמשי דמו בפרודקשן

פעם אחת אחרי שה-DB מחובר:

```bash
curl -X POST https://re-glow-vhp6.vercel.app/api/setup/seed \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

מקומית: `npm run launch:prod`

התחברות:
- **עסק**: `demo@reglow.local` / `Demo1234!`
- **אדמין**: `admin@reglow.local` / `Demo1234!`

## 4.1. הפיכת האימייל האישי שלך לאדמין (מומלץ!)

במקום להשתמש ב-`admin@reglow.local`, אפשר להפוך כל אימייל שכבר נרשם — או חדש — לאדמין עם גישת **Premium מלאה**:

```bash
# העלאת משתמש קיים לאדמין
npm run admin:promote -- your-email@example.com

# יצירת משתמש אדמין חדש (אם לא קיים) — דורש סיסמה כפרמטר שני
npm run admin:promote -- new-admin@example.com SuperSecret123! "Salon Manager"

# שימוש מול URL אחר (למשל preview)
npm run admin:promote -- you@example.com --url=https://preview.vercel.app
```

הסקריפט קורא ל-`/api/setup/promote-admin` עם `CRON_SECRET` מה-`.env.local`. דורש שגם `CRON_SECRET` בפרודקשן יהיה זהה למקומי, או הריצי מקומית מול ה-URL הפרודקשן ועם ה-`CRON_SECRET` של הפרודקשן ב-`.env.local`.

מה זה עושה:
- אם המשתמש קיים → `role: "admin"`, `subscriptionTier: "premium"`
- אם לא קיים → יוצר עם הסיסמה שסיפקת
- מקבל גישה ל-`/admin-dashboard` ו-`/admin-analytics`

## 5. Cron

`vercel.json` מפעיל אוטומטית על Vercel:

- `/api/cron/retention` — 9:00 UTC יומי
- `/api/cron/reactivate` — 8:00 UTC יומי
- `/api/cron/daily-report` — 6:00 UTC יומי (דוח לאדמין)
- `/api/cron/weekly-report` — 7:00 UTC ימי שני (דוח שבועי לאדמין)

ודאי ש-`CRON_SECRET` מוגדר ב-Vercel.

דוחות יישלחו ל-`ADMIN_EMAIL` רק אם גם `RESEND_API_KEY` מוגדר. אחרת — ה-cron עדיין רץ ושומר snapshot ב-DB, אבל לא יישלח מייל (הדוח יירשם ב-logs).

## 6. CLI (אופציונלי)

```bash
npx vercel login
npx vercel link
npm run vercel:sync-env
```

דרוש `VERCEL_TOKEN` או התחברות אינטראקטיבית.
