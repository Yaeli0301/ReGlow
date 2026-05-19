"use client";

import { useEffect, useState } from "react";

interface SystemStatus {
  maintenance: boolean;
  state: string;
  reason?: string;
}

export function MaintenanceBanner() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetch("/api/system/status")
      .then((r) => r.json())
      .then((d: SystemStatus) => setStatus(d))
      .catch(() => null);
  }, []);

  if (!status?.maintenance) return null;

  return (
    <div
      role="alert"
      className="border-b border-red-200 bg-red-600 px-4 py-3 text-center text-sm font-medium text-white"
    >
      המערכת אינה זמינה זמנית
      {status.reason ? ` — ${status.reason}` : ""}. נסי שוב מאוחר יותר.
    </div>
  );
}
