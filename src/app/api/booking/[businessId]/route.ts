import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Service } from "@/models/Service";
import { canAccess } from "@/lib/subscription";
import { upsertClientByPhone } from "@/lib/client-service";
import { createValidatedAppointment } from "@/lib/appointment-create";
import { resetClientRetention } from "@/lib/retention-engine";
import { SchedulingConflictError } from "@/lib/scheduling";
import { getOrCreateBusinessSettings, serializeBusinessSettings } from "@/lib/business-settings";
import { buildPriceBreakdown, serializeService } from "@/lib/pricing";

const bookSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  optIn: z.boolean().refine((v) => v === true, {
    message: "You must agree to receive appointment messages",
  }),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  selectedAddOnIds: z.array(z.string()).optional(),
  date: z.string(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  await connectDB();
  const { businessId } = await params;

  const user = await User.findById(businessId).select("businessName subscriptionTier");
  if (!user || !canAccess(user.subscriptionTier, "booking")) {
    return NextResponse.json({ error: "Booking not available" }, { status: 404 });
  }

  const [services, settings] = await Promise.all([
    Service.find({ userId: businessId, active: true }).sort({ sortOrder: 1 }).lean(),
    getOrCreateBusinessSettings(businessId),
  ]);

  return NextResponse.json({
    businessId,
    businessName: settings.businessName || user.businessName,
    branding: serializeBusinessSettings(settings, true),
    services: services.map((s) =>
      serializeService(s as Parameters<typeof serializeService>[0])
    ),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  await connectDB();
  const { businessId } = await params;

  const user = await User.findById(businessId);
  if (!user || !canAccess(user.subscriptionTier, "booking")) {
    return NextResponse.json({ error: "Booking not available" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = bookSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, phone, optIn, serviceId, serviceName, selectedAddOnIds, date, notes } =
      parsed.data;
    const appointmentDate = new Date(date);

    let service = null;
    if (serviceId) {
      service = await Service.findOne({ _id: serviceId, userId: businessId, active: true });
    }

    const pricing = buildPriceBreakdown({
      service,
      serviceName,
      selectedAddOnIds,
    });

    const client = await upsertClientByPhone({
      userId: businessId,
      name,
      phone,
      optIn,
      notes: notes || "Booked online",
    });

    let appointment;
    try {
      appointment = await createValidatedAppointment({
        userId: businessId,
        clientId: client._id.toString(),
        date: appointmentDate,
        serviceId: service?._id.toString(),
        serviceName: pricing.serviceName,
        selectedAddOns: pricing.selectedAddOns,
        priceLineItems: pricing.lineItems,
        finalPrice: pricing.finalPrice,
        notes: notes || "Online booking",
      });
    } catch (e) {
      if (e instanceof SchedulingConflictError) {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }

    await resetClientRetention(client._id.toString());

    return NextResponse.json(
      {
        success: true,
        appointmentId: appointment._id.toString(),
        message: "Booking confirmed!",
        businessName: user.businessName,
        appointmentDate: appointmentDate.toISOString(),
        serviceName: pricing.serviceName,
        lineItems: pricing.lineItems,
        finalPrice: pricing.finalPrice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
