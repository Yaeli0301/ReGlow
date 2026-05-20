/** Default win-back message (Hebrew). Use {name} placeholder per client. */
export const DEFAULT_WIN_BACK_MESSAGE_HE = `היי {name}, הרבה זמן לא נפגשנו 💕
יש לי תורים פנויים השבוע, רוצה שאשמור לך מקום?`;

export const DEFAULT_WIN_BACK_MESSAGE_EN = `Hi {name}, it's been a while 💕
I have openings this week — want me to save you a spot?`;

export function personalizeWinBackMessage(template: string, clientName: string): string {
  return template.replace(/\{name\}/g, clientName.trim() || "יקירה");
}
