import { Service } from "@/models/Service";
import { resolveDurationMinutes } from "@/lib/scheduling-pure";

export async function resolveServiceDuration(
  userId: string,
  serviceId?: string | null
): Promise<number> {
  if (serviceId) {
    const service = await Service.findOne({ _id: serviceId, userId, active: true });
    return resolveDurationMinutes(service?.durationMinutes);
  }
  return 60;
}
