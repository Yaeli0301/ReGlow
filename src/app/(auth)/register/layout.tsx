import { Suspense } from "react";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-center text-gray-500">Loading...</p>}>{children}</Suspense>;
}
