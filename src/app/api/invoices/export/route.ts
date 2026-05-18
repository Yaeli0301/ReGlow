import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, format } from "date-fns";
import fs from "fs/promises";
import { connectDB } from "@/lib/mongodb";
import { requireAuthFromRequest } from "@/lib/api-auth";
import { canAccess } from "@/lib/subscription";
import { Invoice } from "@/models/Invoice";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!canAccess(auth.user.subscriptionTier, "appointments")) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || format(new Date(), "yyyy-MM");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format (yyyy-MM)" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const invoices = await Invoice.find({
    userId: auth.user.id,
    createdAt: {
      $gte: startOfMonth(new Date(y, m - 1)),
      $lte: endOfMonth(new Date(y, m - 1)),
    },
  }).sort({ createdAt: 1 });

  if (invoices.length === 0) {
    return NextResponse.json({ error: "No invoices for this month" }, { status: 404 });
  }

  const archiver = (await import("archiver")).default;
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const done = new Promise<void>((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });

  for (const inv of invoices) {
    if (inv.pdfPath) {
      try {
        const data = await fs.readFile(inv.pdfPath);
        archive.append(data, { name: `${inv.invoiceNumber}.pdf` });
      } catch {
        /* skip */
      }
    }
  }

  await archive.finalize();
  await done;

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="invoices-${month}.zip"`,
    },
  });
}
