"use server";

import { revalidatePath } from "next/cache";
import { BACKEND_URL } from "@/lib/api";
import { getAvailability, type AvailabilityDay } from "@/lib/availability";
import { getSession, getToken } from "@/lib/auth";

export type CreateBookingInput = {
  contactPhone: string;
  note: string;
  lines: {
    serviceId: number;
    slotId: number;
    quantity: number;
    companionCount: number;
    attendees: {
      fullName: string;
      idNumber: string;
      email: string;
      phone?: string;
      weightKg?: string;
      extraIds: number[];
    }[];
  }[];
};

export type CreateBookingResult =
  | { ok: true; reference: string }
  | { ok: false; error: string; needsLogin?: boolean };

/** Disponibilidad fresca de una zona para el paso 1. Se refresca al elegir localidad. */
export async function fetchAvailabilityAction(
  location: string,
  from: string,
  to: string,
): Promise<AvailabilityDay[]> {
  return getAvailability(from, to, location);
}

/** ¿Hay sesión y de qué tipo? Lo usa el paso de la cuenta. */
export async function getSessionAction(): Promise<{
  email: string;
  fullName: string | null;
  idNumber: string | null;
  phone: string | null;
} | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    email: session.email,
    fullName: session.fullName,
    idNumber: session.idNumber,
    phone: session.phone,
  };
}

export async function createBookingAction(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", needsLogin: true };
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "No se pudo contactar con el servidor." };
  }

  // 401 y 403 no son lo mismo: el token caducado se arregla entrando otra vez,
  // pero una cuenta de administrador tiene sesión válida y aun así no reserva.
  if (res.status === 401) {
    return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", needsLogin: true };
  }

  if (res.status === 403) {
    return {
      ok: false,
      error:
        "Esta cuenta no puede reservar. Las reservas se hacen desde una cuenta de cliente — sal y entra con la tuya.",
    };
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body.error as { message?: string }).message
        : undefined;
    return { ok: false, error: message ?? `El servidor respondió ${res.status}.` };
  }

  // La disponibilidad ha cambiado para todo el mundo.
  revalidatePath("/reserva");
  revalidatePath("/cuenta");

  return { ok: true, reference: (body as { data: { reference: string } }).data.reference };
}
