"use client";

import { WinBackFlow } from "@/components/recover/WinBackFlow";
import { useAppUser } from "@/contexts/AppUserContext";
import { canAccess } from "@/lib/subscription";
import { useT } from "@/contexts/LanguageContext";
import Link from "next/link";

export default function RecoverClientsPage() {
  const t = useT();
  const user = useAppUser();
  const hasAccess = canAccess(user.subscriptionTier, "lostClients");

  if (!hasAccess) {
    return (
      <div className="card max-w-lg text-center">
        <h1 className="text-xl font-bold">{t("lostClients.lockedTitle", { count: "—" })}</h1>
        <p className="mt-2 text-gray-600">{t("lostClients.lockedDesc")}</p>
        <Link
          href="/billing"
          className="btn-primary mt-4 inline-block"
        >
          {t("lostClients.upgradeCta")}
        </Link>
      </div>
    );
  }

  return <WinBackFlow />;
}
