"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  copyDay,
  deleteSlot,
  saveDay,
  UnauthorizedError,
  updateSlot,
  type SlotInput,
} from "@/lib/admin-api";

type Result = { ok: true } | { ok: false; error: string };

/** La disponibilidad afecta a la página de reserva, no al catálogo. */
function revalidateBookingPages(): void {
  revalidatePath("/admin/disponibilidad");
  revalidatePath("/reserva");
}

async function run(fn: () => Promise<{ ok: true } | { ok: false; errors: Record<string, string> }>): Promise<Result> {
  try {
    const result = await fn();
    if (!result.ok) {
      const first = Object.values(result.errors)[0];
      return { ok: false, error: first ?? "No se pudo guardar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidateBookingPages();
  return { ok: true };
}

export async function saveDayAction(
  location: string,
  date: string,
  slots: SlotInput[],
): Promise<Result> {
  return run(() => saveDay(location, date, slots));
}

export async function copyDayAction(
  location: string,
  from: string,
  to: string[],
): Promise<{ ok: true; created: number; skipped: number } | { ok: false; error: string }> {
  try {
    const result = await copyDay(location, from, to);
    if (!result.ok) {
      const first = Object.values(result.errors)[0];
      return { ok: false, error: first ?? "No se pudo copiar." };
    }
    revalidateBookingPages();
    return { ok: true, created: result.data.created, skipped: result.data.skipped };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }
}

export async function toggleSlotAction(id: number, isOpen: boolean): Promise<Result> {
  return run(() => updateSlot(id, { isOpen }));
}

export async function deleteSlotAction(id: number): Promise<Result> {
  return run(() => deleteSlot(id));
}
