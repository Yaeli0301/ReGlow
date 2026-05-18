# ReGlow — SaaS Operating System for Beauty Businesses

A full production-ready SaaS platform for cosmetologists:
appointments, clients, retention automation, payments, invoices, analytics.

**Live app:** [https://reglow.onrender.com](https://reglow.onrender.com)  
**Repo:** [https://github.com/Yaeli0301/ReGlow](https://github.com/Yaeli0301/ReGlow)

---

## 🧠 CORE ARCHITECTURE

Multi-tenant SaaS system:

- Each business = isolated data space (`userId` on every document; public routes use `businessId` = owner `User._id`)
- Each user belongs to exactly one business
- No cross-business data access allowed

---

## 🧰 TECH STACK

- Next.js 15 (App Router) + TypeScript
- MongoDB + Mongoose
- Tailwind CSS (RTL support)
- JWT authentication (cookie: `reglow_token`)
- Stripe subscriptions
- Cron jobs (Vercel `vercel.json`; see [docs/RENDER-ATLAS.md](docs/RENDER-ATLAS.md) for Render)

---

## 🔐 ROLES

### USER (Business Owner)

- manages clients
- manages appointments
- views analytics
- configures pricing & availability

### ADMIN (Platform Owner)

- views all businesses
- manages users
- system-wide analytics
- feedback moderation

---

## 🚀 ENVIRONMENTS

### ENV_MODE

| Mode | Description |
|------|-------------|
| `production` | real DB, Stripe, persistent data |
| `demo` | seeded demo data, resettable state |

⚠️ Demo must use a **separate database** (`MONGODB_URI_DEMO`). Never share with production.

Local-only fallback: if `ENV_MODE=demo` and no URI is set, in-memory Mongo is used for dev without installing MongoDB.

---

## 🧪 DEMO SYSTEM

- Auto-seed data on first run (demo mode)
- Demo user login: `demo@reglow.local` / `Demo1234!`
- Admin demo: `admin@reglow.local` / `Demo1234!`
- Reset endpoint: `POST /api/demo/reset`

```bash
npm run seed:users   # create demo users in Atlas/local Mongo
```

---

## 📅 CORE MODULES

### 1. Smart Scheduling

- prevents overlapping appointments
- uses service duration
- respects availability rules

Files: `src/lib/scheduling.ts`

### 2. Retention Engine

- finds clients inactive 30–45 days
- sends automated reactivation messages
- fallback messaging if no response

Runs via cron.

### 3. Cancellation System

- cancel appointment
- cancel full day
- reschedule flow with token

### 4. Payments & Invoices

- cash / card / Bit (manual confirmation)
- auto invoice generation
- monthly export (PDF/ZIP)

### 5. Analytics Dashboard

- revenue
- active clients
- churn rate
- returning clients revenue (key metric)

### 6. Feedback System

- user suggestions
- admin moderation panel

### 7. Pricing Plans

- **Basic:** clients + dashboard
- **Pro:** scheduling + automation
- **Premium:** booking page + full system

---

## 🧍 CLIENT FLOW

- Public booking: `/book/[businessId]`
- Reschedule: `/reschedule/[token]`

---

## 🧩 DATA ISOLATION RULE (CRITICAL)

Every query MUST include `userId` (business owner id).

No global queries allowed.

---

## ⏰ CRON JOBS (Vercel)

- `/api/cron/retention` → hourly
- `/api/cron/reactivation` → daily

Requires: `Authorization: Bearer CRON_SECRET`

---

## 🔐 SECURITY

- bcrypt password hashing
- JWT authentication
- protected API routes
- role-based access control
- strict tenant isolation

---

## 📦 IMPORTANT RULES

- NEVER mix demo and production data
- NEVER allow cross-business access
- NEVER send real WhatsApp messages (only `wa.me` links)
- ALWAYS validate appointment duration + overlap

---

## 🎯 PRODUCT GOAL

ReGlow must behave like a real SaaS business OS:
fast, stable, scalable, and ready for paying customers.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill MONGODB_URI, JWT_SECRET, etc.
npm run dev:clean
```

Open [http://localhost:3000](http://localhost:3000)

```bash
npm run build
npm test
npm run test:smoke
```

### Health check

```bash
curl http://localhost:3000/api/health
```

---

## Deploy: Render + MongoDB Atlas

Full checklist: **[docs/RENDER-ATLAS.md](docs/RENDER-ATLAS.md)**

1. Atlas: connection string with database name `reglow`, network access `0.0.0.0/0`.
2. Render → **Environment** → set `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL=https://reglow.onrender.com`, `ENV_MODE=production`.
3. Redeploy → verify [https://reglow.onrender.com/api/health](https://reglow.onrender.com/api/health) shows `"database":"ok"`.
4. Run `npm run seed:users` locally (with production `MONGODB_URI` in env) to create demo logins in Atlas.

Optional: connect this repo to Render using `render.yaml` (Blueprint).

---

## Environment variables

See `.env.example`. Never commit `.env.local`.

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Production database |
| `MONGODB_URI_DEMO` | Demo-only database |
| `JWT_SECRET` | Auth (min 32 chars) |
| `ENV_MODE` | `production` \| `demo` |
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `CRON_SECRET` | Cron authorization |
| `STRIPE_*` | Billing |
