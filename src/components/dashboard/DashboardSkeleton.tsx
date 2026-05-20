export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pb-24" aria-busy="true">
      <div className="h-10 w-56 rounded-lg bg-brand-100" />
      <div className="h-40 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50" />
      <div className="h-48 rounded-2xl bg-brand-50" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-brand-50" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
