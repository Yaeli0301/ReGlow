# הגדרה מלאה — ReGlow (מקומי + ענן)

## 1. MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → **Connect** → **Drivers**
2. העתיקי מחרוזת עם שם מסד: `...mongodb.net/reglow?...`
3. **Network Access** → `0.0.0.0/0` (פיתוח / Render)
4. **Database Access** → משתמש עם סיסמה

אם יש שגיאת `querySrv ECONNREFUSED` במחשב:

- נסי רשת אחרת / כיבוי VPN
- או ב-Atlas: Connect → **Drivers** → בחרי **Connection String Only** (ללא SRV) והדביקי ב-`MONGODB_URI`

## 2. מקומי (`.env.local`)

```env
ENV_MODE=production
MONGODB_URI=mongodb+srv://USER:PASS@cluster....mongodb.net/reglow?retryWrites=true&w=majority
JWT_SECRET=מחרוזת-אקראית-32-תווים-לפחות
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm install
npm run seed:users
npm run dev:clean
npm run deploy:verify
```

התחברות: `demo@reglow.local` / `Demo1234!`

## 3. Render (ענן)

Dashboard → **reglow** → **Environment** → הוסיפי:

| משתנה | ערך |
|--------|-----|
| `MONGODB_URI` | אותה מחרוזת Atlas עם `/reglow` |
| `JWT_SECRET` | מפתח אקראי 32+ תווים |
| `ENV_MODE` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://reglow.onrender.com` |
| `CRON_SECRET` | מפתח אקראי |

**Save** → **Manual Deploy**

בדיקה: [https://reglow.onrender.com/api/health](https://reglow.onrender.com/api/health)  
חייב: `"database":"ok"`

### סנכרון אוטומטי (אופציונלי)

1. [API Keys](https://dashboard.render.com/u/settings#api-keys) → צרי מפתח
2. ב-`.env.local` (לא ב-Git):

```env
RENDER_API_KEY=rnd_...
RENDER_SERVICE_ID=srv-d85ir0faqgkc73be6ft0
```

3. הריצי:

```bash
npm run render:sync-env
```

## 4. Git → פריסה אוטומטית

כל `git push` ל-`main` מעדכן את Render (אם מחובר ל-GitHub).

```bash
npm test
npm run build
git push origin main
```

## 5. בדיקות

```bash
npm run deploy:verify              # localhost
npm run deploy:verify:prod         # Render
```
