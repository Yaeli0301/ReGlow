import Link from "next/link";

/** Fixed bottom CTA — mobile landing only */
export function MobileDemoCta() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-200 bg-white/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <Link
        href="/demo/start?plan=pro"
        className="btn-primary flex min-h-[44px] w-full items-center justify-center text-base font-bold"
      >
        להתחיל דמו חינם
      </Link>
    </div>
  );
}
