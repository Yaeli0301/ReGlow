import { differenceInDays } from "date-fns";
import type { ClientStatus } from "@/types";

export function computeClientStatus(lastVisitDate: Date | null | undefined): ClientStatus {
  if (!lastVisitDate) return "active";

  const days = differenceInDays(new Date(), new Date(lastVisitDate));

  if (days >= 30) return "lost";
  if (days >= 15) return "atRisk";
  return "active";
}

export function daysSinceVisit(lastVisitDate: Date | null | undefined): number {
  if (!lastVisitDate) return 0;
  return differenceInDays(new Date(), new Date(lastVisitDate));
}
