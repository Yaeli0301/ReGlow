import { redirect } from "next/navigation";

/** Public booking URL — same page as /book/{id} (rewrite in next.config.ts). */
export default async function BookingAliasPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  redirect(`/book/${businessId}`);
}
