import { NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { canAccess } from "@/lib/subscription";
import { upsertClientByPhone } from "@/lib/client-service";
import { getAvailableSlots } from "@/lib/availability";

const bookSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  optIn: z.boolean().refine((v) => v === true, {
    message: "You must agree to receive appointment messages",
  }),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
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

  const services = await Service.find({ userId: businessId, active: true }).lean();

  return NextResponse.json({
    businessName: user.businessName,
    services,
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

    const { name, phone, optIn, serviceId, serviceName, date, notes } = parsed.data;
    const appointmentDate = new Date(date);

    const daySlots = await getAvailableSlots(businessId, startOfDay(appointmentDate));
    const slotValid = daySlots.some(
      (s) => Math.abs(s.start.getTime() - appointmentDate.getTime()) < 60000
    );

    if (!slotValid) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    let resolvedServiceName = serviceName || "General";

    if (serviceId) {
      const service = await Service.findOne({ _id: serviceId, userId: businessId });
      if (service) resolvedServiceName = service.name;
    }

    const client = await upsertClientByPhone({
      userId: businessId,
      name,
      phone,
      lastVisitDate: appointmentDate,
      optIn,
      notes: notes || "Booked online",
    });

    const appointment = await Appointment.create({
      userId: businessId,
      clientId: client._id,
      date: appointmentDate,
      status: "scheduled",
      serviceName: resolvedServiceName,
      notes: notes || "Online booking",
    });

    return NextResponse.json(
      {
        success: true,
        appointmentId: appointment._id.toString(),
        message: "Booking confirmed!",
        businessName: user.businessName,
        appointmentDate: appointmentDate.toISOString(),
        serviceName: resolvedServiceName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
