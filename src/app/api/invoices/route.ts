import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth } from "date-fns";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Invoice } from "@/models/Invoice";

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const query: Record<string, unknown> = { userId: auth.user.id };

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    query.createdAt = {
      $gte: startOfMonth(new Date(y, m - 1)),
      $lte: endOfMonth(new Date(y, m - 1)),
    };
  }

  const invoices = await Invoice.find(query).sort({ createdAt: -1 }).limit(500).lean();

  return NextResponse.json({
    invoices: invoices.map((inv) => ({
      _id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      currency: inv.currency,
      clientName: inv.clientSnapshot.name,
      pdfUrl: inv.pdfUrl,
      createdAt: inv.createdAt,
    })),
  });
}
