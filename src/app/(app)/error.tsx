"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-lg text-center">
      <h1 className="text-xl font-bold text-gray-900">משהו השתבש</h1>
      <p className="mt-2 text-sm text-gray-600">
        נסי לרענן את הדף. אם הבעיה נמשכת, עצרי את השרת והריצי:{" "}
        <code className="rounded bg-gray-100 px-1">npm run dev:clean</code>
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => reset()}>נסי שוב</Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          רענון מלא
        </Button>
      </div>
    </div>
  );
}
