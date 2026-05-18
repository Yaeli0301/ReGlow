import { BusinessSettings, type IBusinessSettings } from "@/models/BusinessSettings";
import { User } from "@/models/User";
import type { Types } from "mongoose";

export async function getOrCreateBusinessSettings(
  userId: string | Types.ObjectId
): Promise<IBusinessSettings> {
  let settings = await BusinessSettings.findOne({ userId });
  if (settings) return settings;

  const user = await User.findById(userId).select("businessName");
  settings = await BusinessSettings.create({
    userId,
    businessName: user?.businessName || "ReGlow",
    themeColor: "#c026d3",
  });
  return settings;
}

export function serializeBusinessSettings(s: IBusinessSettings, publicView = false) {
  return {
    businessName: s.businessName,
    themeColor: s.themeColor,
    logoUrl: s.logoUrl,
    ...(publicView && s.logoData ? { logoData: s.logoData } : {}),
    ...(publicView ? {} : { hasLogo: Boolean(s.logoData || s.logoUrl) }),
    ...(!publicView && s.logoData ? { logoData: s.logoData } : {}),
  };
}
