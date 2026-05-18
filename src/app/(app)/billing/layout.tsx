import { Suspense } from "react";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-gray-500">Loading billing...</p>}>{children}</Suspense>;
}
