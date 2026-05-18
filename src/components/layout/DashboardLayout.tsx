import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { DEMO_OWNER_EMAIL } from "@/lib/seed/demo-seed";
import { AppShell } from "./AppShell";

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell user={session} demoMode={isDemoMode()} demoEmail={DEMO_OWNER_EMAIL}>
      {children}
    </AppShell>
  );
}
