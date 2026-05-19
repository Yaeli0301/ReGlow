import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <OnboardingClient userName={session.businessName || session.email} />;
}
