# Vercel + MongoDB Atlas — ReGlow

Production URL: **https://re-glow.vercel.app**

> **לא צריך** `npx create-next-app --example with-mongodb` — זה מדריך לאפליקיה חדשה.  
> **ReGlow כבר מחובר** ל-Mongoose; אחרי חיבור DB ב-Vercel Dashboard עשי רק את השלבים למטה.

## אם חיברת MongoDB ב-Vercel (Integration)

1. **Projects** — ודאי שהפרויקט `re-glow` מחובר למסד.
2. מקומית:
   ```bash
   npx vercel link
   vercel env pull
   ```
   זה יוצר/מעדכן `.env.local` עם `MONGODB_URI` מ-Vercel.
3. `npm run dev` → http://localhost:3000
4. בפרודקשן: **Redeploy** ב-Vercel אחרי שינוי env.

ReGlow כולל כבר `attachDatabasePool` מ-`@vercel/functions` ב-`src/lib/mongodb.ts` (מומלץ ל-Vercel).

## 1. MongoDB Atlas (חובה לפני Vercel)

1. [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access** → **Add IP** → `0.0.0.0/0`  
   (מאפשר ל-Vercel להתחבר)
2. **Database Access** → משתמש `yaeli` עם הסיסמה שלך
3. **Connect** → Drivers → העתיקי מחרוזת עם `/reglow`:

```text
mongodb+srv://yaeli:YOUR_PASSWORD@cluster0.iociobd.mongodb.net/reglow?retryWrites=true&w=majority&appName=Cluster0
```

## 2. Vercel — Environment Variables

[Vercel Dashboard](https://vercel.com) → הפרויקט **re-glow** → **Settings** → **Environment Variables**

הוסיפי לכל הסביבות: **Production**, **Preview**, **Development**

| Key | Value |
|-----|--------|
| `MONGODB_URI` | מחרוזת Atlas למעלה (עם `/reglow`) |
| `JWT_SECRET` | מחרוזת אקראית 32+ תווים (שונה ממקומי!) |
| `ENV_MODE` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://re-glow.vercel.app` |
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

**Save** → **Deployments** → פריסה **חדשה** מ-`main` (לא רק Redeploy).

### למה אחרי Redeploy האתר עדיין נראה ישן?

**Redeploy** על פריסה ישנה = אותו קוד ישן (אנגלית, בלי RTL). זה **לא** מושך את GitHub.

סימנים שהפרודקשן תקוע על גרסה ישנה:
- דף הבית באנגלית: "Bring your clients back"
- `https://re-glow.vercel.app/api/setup/status` מחזיר **404**
- אחרי דחיפה ל-GitHub האתר לא משתנה

**פתרון:**

1. [Vercel Dashboard](https://vercel.com) → פרויקט **re-glow** → **Settings** → **Git**
2. ודאי: Repository = `Yaeli0301/ReGlow`, Production Branch = `main`
3. אם אין חיבור Git — **Connect Git Repository** ובחרי את הריפו
4. **Deployments** → הפריסה האחרונה מ-`main` (commit `32f8720` ומעלה) → **⋯** → **Promote to Production**  
   (או המתיני ל-Deploy אוטומטי אחרי `git push`)
5. **אל** תלחצי רק "Redeploy" על הפריסה הישנה

אימות שהגרסה החדשה עלתה:

```text
https://re-glow.vercel.app/api/setup/status
```

צריך JSON עם `"deploy":{"commit":"32f8720"}` (או commit חדש יותר), ודף הבית בעברית עם `lang="he" dir="rtl"`.

## 3. בדיקה

```text
https://re-glow.vercel.app/api/health
```

צריך:

```json
{
  "status": "healthy",
  "checks": {
    "env_jwt": "ok",
    "env_mongo": "ok",
    "database": "ok"
  }
}
```

אם `database: error` — בדקי IP ב-Atlas ו-`MONGODB_URI`.

בדיקת הגדרות (ללא סודות):

```text
https://re-glow.vercel.app/api/setup/status
```

יצירת משתמשי דמו בפרודקשן (פעם אחת, אחרי DB מחובר):

```bash
curl -X POST https://re-glow.vercel.app/api/setup/seed \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

מקומית: `npm run launch:prod`

## 4. משתמשי דמו ב-Atlas

מהמחשב (אחרי ש-`.env.local` נכון):

```bash
npm run seed:users
```

התחברות: `demo@reglow.local` / `Demo1234!`

## 5. Cron

`vercel.json` מפעיל אוטומטית על Vercel:

- `/api/cron/retention` — כל שעה
- `/api/cron/reactivate` — יומי

וודאי ש-`CRON_SECRET` מוגדר ב-Vercel.

## 6. CLI (אופציונלי)

```bash
npx vercel login
npx vercel link
npm run vercel:sync-env
```

דרוש `VERCEL_TOKEN` או התחברות אינטראקטיבית.
