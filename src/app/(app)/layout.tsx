import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="he">
      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
}
