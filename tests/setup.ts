process.env.ENV_MODE = process.env.ENV_MODE || "production";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-minimum-32-characters";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret-1234567890abcdef";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
