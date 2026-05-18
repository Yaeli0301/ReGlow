const REFERRAL_PREFIX = "GLOW-";
const MAX_REFERRALS_PER_REFERRER = 100;

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${REFERRAL_PREFIX}${code}`;
}

export function normalizeReferralCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  return trimmed.startsWith(REFERRAL_PREFIX) ? trimmed : `${REFERRAL_PREFIX}${trimmed}`;
}

export function buildReferralLink(referralCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/register?ref=${encodeURIComponent(referralCode)}`;
}

export function buildReferralShareMessage(referralLink: string): string {
  return `היי! 💖 אני משתמשת ב-ReGlow לניהול הסלון שלי — ממליצה בחום! נרשמי דרך הקישור ונקבל שתינו הטבה:\n${referralLink}`;
}

export { MAX_REFERRALS_PER_REFERRER };
