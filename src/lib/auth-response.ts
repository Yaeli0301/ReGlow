import type { SessionUser } from "@/types";

export function authSuccessPayload(session: SessionUser, token: string) {
  return {
    token,
    user: {
      id: session.id,
      email: session.email,
      role: session.role,
      businessName: session.businessName,
      subscriptionTier: session.subscriptionTier,
    },
  };
}
