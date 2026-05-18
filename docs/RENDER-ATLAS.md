# Render + MongoDB Atlas

## 1. Atlas (database)

1. [MongoDB Atlas](https://cloud.mongodb.com) → **Database** → **Connect** → **Drivers**.
2. Copy the connection string and set the database name to `reglow`:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/reglow?retryWrites=true&w=majority&appName=Cluster0
```

3. **Network Access** → Add IP `0.0.0.0/0` (development / Render free tier).
4. **Database Access** → user with read/write on `reglow`.
5. Optional demo DB (separate cluster or database `reglow_demo`):

```text
mongodb+srv://...@cluster0.xxxxx.mongodb.net/reglow_demo?...
```

## 2. Render (app)

Dashboard → service **reglow** → **Environment**:

| Variable | Required | Example |
|----------|----------|---------|
| `MONGODB_URI` | Yes | Atlas URI → `/reglow` |
| `JWT_SECRET` | Yes | 32+ random chars |
| `ENV_MODE` | Yes | `production` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://reglow.onrender.com` |
| `CRON_SECRET` | For cron | random 16+ chars |
| `STRIPE_*` | For billing | from Stripe Dashboard |

After saving → **Manual Deploy** (or push to connected branch).

## 3. Verify

```text
https://reglow.onrender.com/api/health
```

Expected:

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

Seed demo users (from your machine, with `MONGODB_URI` in env):

```bash
npm run seed:users
```

Login: `demo@reglow.local` / `Demo1234!`

## 4. Cron on Render

Render does not run `vercel.json` crons. Options:

- External cron (e.g. [cron-job.org](https://cron-job.org)) hitting:
  - `GET https://reglow.onrender.com/api/cron/retention`
  - `GET https://reglow.onrender.com/api/cron/reactivation`
  - Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Or deploy cron routes on Vercel and keep app on Render.
