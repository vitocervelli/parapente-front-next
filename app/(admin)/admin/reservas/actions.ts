"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAvailability, type AvailabilityDay } from "@/lib/availability";
import {
  acceptProof,
  createAdminBooking,
  rejectProof,
  transitionBooking,
  UnauthorizedError,
  updateBooking,
  updateProof,
  type BookingEdit,
  type CreateAdminBookingInput,
} from "@/lib/admin-api";

type Result = { ok: true } | { ok: false; error: string };

function revalidateBookingViews(id: number): void {
  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${id}`);
  // El estado también lo ve el cliente en su área.
  revalidatePath("/cuenta");
}

async function run(
  id: number,
  fn: () => Promise<{ ok: true } | { ok: false; errors: Record<string, string> }>,
): Promise<Result> {
  try {
    const result = await fn();
    if (!result.ok) {
      return { ok: false, error: Object.values(result.errors)[0] ?? "No se pudo aplicar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidateBookingViews(id);
  return { ok: true };
}

export async function acceptProofAction(
  bookingId: number,
  proofId: number,
  input: { amount: string; reference: string; note: string },
): Promise<Result> {
  if (!input.amount.trim()) {
    return { ok: false, error: "Indica el importe de esta transferencia." };
  }

  return run(bookingId, () =>
    acceptProof(bookingId, proofId, {
      declaredAmount: input.amount.trim(),
      transferReference: input.reference.trim() || null,
      note: input.note.trim() || null,
    }),
  );
}

export async function rejectProofAction(
  bookingId: number,
  proofId: number,
  note: string,
): Promise<Result> {
  if (!note.trim()) {
    return { ok: false, error: "Indica por qué se rechaza; el cliente verá el motivo." };
  }
  return run(bookingId, () => rejectProof(bookingId, proofId, note.trim()));
}

export async function updateBookingAction(id: number, input: BookingEdit): Promise<Result> {
  return run(id, () => updateBooking(id, input));
}

export async function updateProofAction(
  bookingId: number,
  proofId: number,
  input: { amount: string; reference: string; note: string },
): Promise<Result> {
  return run(bookingId, () =>
    updateProof(bookingId, proofId, {
      declaredAmount: input.amount.trim() || null,
      transferReference: input.reference.trim() || null,
      note: input.note.trim() || null,
    }),
  );
}

export async function transitionBookingAction(
  bookingId: number,
  action: "confirm" | "complete" | "no-show" | "reject" | "cancel",
  note: string | null,
): Promise<Result> {
  return run(bookingId, () => transitionBooking(bookingId, action, note?.trim() || null));
}

/** Disponibilidad (franjas abiertas con sitio) de una zona, para el alta manual. */
export async function fetchDisponibilidadAction(
  location: string,
  from: string,
  to: string,
): Promise<AvailabilityDay[]> {
  return getAvailability(from, to, location);
}

/** Crea una reserva desde el panel (cliente por teléfono). */
export async function crearReservaAdminAction(
  input: CreateAdminBookingInput,
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  try {
    const result = await createAdminBooking(input);
    if (!result.ok) {
      return { ok: false, error: Object.values(result.errors)[0] ?? "No se pudo crear la reserva." };
    }
    revalidatePath("/admin/reservas");
    revalidatePath("/cuenta");
    return { ok: true, reference: result.data.reference };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }
}
