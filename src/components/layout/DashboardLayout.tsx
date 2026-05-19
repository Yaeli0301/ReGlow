import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { isLandingDemoVisitor } from "@/lib/landing-demo-session";
import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-seed";
import { AppShell } from "./AppShell";

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const landingDemo = isLandingDemoVisitor(session);
  const demoMode = isDemoMode() || landingDemo;
  return (
    <AppShell
      user={session}
      demoMode={demoMode}
      landingDemo={landingDemo}
      demoEmail={DEMO_OWNER_EMAIL}
    >
      {children}
    </AppShell>
  );
}
