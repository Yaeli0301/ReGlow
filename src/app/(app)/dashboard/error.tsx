"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="card max-w-lg text-center">
      <h1 className="text-xl font-bold text-red-600">שגיאה בטעינת לוח הבקרה</h1>
      <p className="mt-2 text-sm text-gray-600">
        לרוב זה קשור לחיבור MongoDB. בדקי את <code className="text-xs">MONGODB_URI</code> ואת
        רשימת ה-IP ב-Atlas.
      </p>
      <Button className="mt-4 min-h-[44px]" onClick={reset}>
        נסי שוב
      </Button>
    </div>
  );
}
