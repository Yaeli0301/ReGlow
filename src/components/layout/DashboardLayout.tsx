import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "./AppShell";

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <AppShell user={session}>{children}</AppShell>;
}
