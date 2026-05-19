"use client";

import { useEffect, useState } from "react";
import {
  getCachedMaintenanceStatus,
  setCachedMaintenanceStatus,
} from "@/lib/system-status-cache";

interface SystemStatus {
  maintenance: boolean;
  state: string;
  reason?: string;
}

function parseStatusPayload(data: Record<string, unknown>): SystemStatus | null {
  if (typeof data.maintenance === "boolean" && typeof data.state === "string") {
    return {
      maintenance: data.maintenance,
      state: data.state,
      reason: typeof data.reason === "string" ? data.reason : undefined,
    };
  }

  const system = data.system as Record<string, unknown> | undefined;
  if (system && typeof system.state === "string") {
    return {
      maintenance: Boolean(system.maintenance ?? system.state === "BLOCKED"),
      state: system.state,
      reason: typeof system.reason === "string" ? system.reason : undefined,
    };
  }

  return null;
}

async function fetchSystemStatus(): Promise<SystemStatus | null> {
  const endpoints = ["/api/system/status", "/api/health"];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      const parsed = parseStatusPayload(data);
      if (parsed) return parsed;
    } catch {
      // try next endpoint
    }
  }

  return null;
}

export function MaintenanceBanner() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    const cached = getCachedMaintenanceStatus();
    if (cached) {
      setStatus({
        maintenance: cached.maintenance,
        state: cached.maintenance ? "BLOCKED" : "READY",
        reason: cached.reason,
      });
      return;
    }

    let cancelled = false;
    fetchSystemStatus().then((result) => {
      if (cancelled || !result) return;
      setCachedMaintenanceStatus(result.maintenance, result.reason);
      setStatus(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.maintenance) return null;

  return (
    <div
      role="alert"
      className="border-b border-red-200 bg-red-600 px-4 py-3 text-center text-base font-medium text-white md:text-sm"
    >
      המערכת אינה זמינה זמנית
      {status.reason ? ` — ${status.reason}` : ""}. נסי שוב מאוחר יותר.
    </div>
  );
}
