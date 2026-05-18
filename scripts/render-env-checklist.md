# Render environment checklist (copy into Render Dashboard)

Set these on https://dashboard.render.com → reglow → Environment:

```
ENV_MODE=production
NEXT_PUBLIC_APP_URL=https://reglow.onrender.com
MONGODB_URI=<paste Atlas URI with /reglow>
JWT_SECRET=<generate 32+ random characters>
CRON_SECRET=<generate 16+ random characters>
```

Optional (billing):

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
```

Then: **Save Changes** → **Manual Deploy**.

Verify: https://reglow.onrender.com/api/health
