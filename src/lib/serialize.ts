/** Safe JSON shapes for API responses (avoids Mongoose ObjectId / Date issues). */

export function serializeAppointmentRow(a: {
  _id: { toString(): string };
  date: Date | string;
  status: string;
  serviceName?: string;
  clientId?: {
    _id?: { toString(): string };
    name?: string;
    phone?: string;
  } | null;
}) {
  const client = a.clientId;
  return {
    _id: a._id.toString(),
    date: a.date instanceof Date ? a.date.toISOString() : String(a.date),
    status: a.status,
    serviceName: a.serviceName,
    clientId: client?._id
      ? {
          _id: client._id.toString(),
          name: client.name || "—",
          phone: client.phone,
        }
      : null,
  };
}
