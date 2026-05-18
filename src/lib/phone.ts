/** Normalize phone to digits-only key for deduplication (Israel-friendly). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (!digits.startsWith("972") && digits.length <= 10) return "972" + digits;
  return digits;
}

/** Display-friendly phone (keeps user input trimmed). */
export function formatPhoneDisplay(phone: string): string {
  return phone.trim();
}
