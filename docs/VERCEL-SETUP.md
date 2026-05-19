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
| `MONGODB_URI` | מחרוזת Atlas (רצוי עם `/reglow`) |
| `JWT_SECRET` | מחרוזת אקראית 32+ תווים (שונה ממקומי!) |
| `ENV_MODE` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://re-glow-vhp6.vercel.app` |
| `CRON_SECRET` | מחרוזת אקראית 16+ תווים |
| `ENABLE_LANDING_DEMO` | `true` — כפתור דמו בדף הנחיתה (מכירה) |

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

התחברות: `demo@reglow.local` / `Demo1234!`

## 5. Cron

`vercel.json` מפעיל אוטומטית על Vercel:

- `/api/cron/retention` — כל שעה
- `/api/cron/reactivate` — יומי

ודאי ש-`CRON_SECRET` מוגדר ב-Vercel.

## 6. CLI (אופציונלי)

```bash
npx vercel login
npx vercel link
npm run vercel:sync-env
```

דרוש `VERCEL_TOKEN` או התחברות אינטראקטיבית.
