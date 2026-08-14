// Solo servidor: lee el token de la cookie httpOnly.
import { BACKEND_URL } from "./api";
import { getToken } from "./auth";

export type BookingAttendee = {
  id: number;
  fullName: string;
  idNumber: string;
  email: string;
  phone: string | null;
  weightKg: number | null;
};

export type BookingLine = {
  id: number;
  serviceName: string;
  serviceSlug: string | null;
  quantity: number;
  seatsTotal: number;
  unitPrice: { amount: string; currency: string; display: string };
  lineTotal: { amount: string; display: string };
  slot: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    label: string;
  } | null;
  attendees: BookingAttendee[];
};

export type Proof = {
  id: number;
  status: "pending" | "accepted" | "rejected";
  statusLabel: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  declaredAmount: string | null;
  transferReference: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type Booking = {
  reference: string;
  status: string;
  statusLabel: string;
  isLive: boolean;
  total: { amount: string; currency: string; display: string };
  /** Suma de los comprobantes aceptados: el pago puede venir partido. */
  paid: { amount: string; display: string };
  outstanding: { amount: string; display: string };
  isFullyPaid: boolean;
  seats: number;
  /** Personas reales de la reserva (paquetes de X personas cuentan como X). */
  people: number;
  contactPhone: string | null;
  customerNote: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  lines: BookingLine[];
  proofs: Proof[];
};

/** Reservas del cliente autenticado. Lista vacía si algo falla. */
export async function getMyBookings(): Promise<Booking[]> {
  const token = await getToken();
  if (!token) return [];

  try {
    const res = await fetch(`${BACKEND_URL}/api/account/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const body = (await res.json()) as { data: Booking[] };
    return body.data;
  } catch {
    return [];
  }
}

export async function getMyBooking(reference: string): Promise<Booking | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/account/bookings/${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { data: Booking };
    return body.data;
  } catch {
    return null;
  }
}
