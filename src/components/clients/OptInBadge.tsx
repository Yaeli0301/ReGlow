export function OptInBadge({ optIn }: { optIn: boolean }) {
  if (optIn) {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        WhatsApp ✓
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
      No opt-in
    </span>
  );
}
