"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createExtra,
  createItem,
  createLocation,
  createService,
  deleteExtra,
  deleteItem,
  deleteLocation,
  deleteService,
  reorderServices,
  UnauthorizedError,
  updateAdminSettings,
  updateExtra,
  updateItem,
  updateLocation,
  updateService,
  uploadImage,
  type FieldErrors,
  type InclusionInput,
  type ServiceInput,
} from "@/lib/admin-api";
import { clearToken, login } from "@/lib/auth";

export type FormState = { errors?: FieldErrors; message?: string } | null;

/** Refresca la web pública además del panel: un cambio de precio se ve al momento. */
function revalidatePublicPages(): void {
  revalidatePath("/");
  revalidatePath("/servicios");
  revalidatePath("/contacto");
  revalidatePath("/admin");
}

function toNullable(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
}

/** Convierte las filas repetidas del editor en el array que espera la API. */
function readInclusions(formData: FormData): InclusionInput[] {
  const ids = formData.getAll("inclusionItemId");
  const labels = formData.getAll("inclusionLabel");

  return ids
    .map((raw, index) => ({
      itemId: Number(raw),
      labelOverride: toNullable(labels[index] ?? null),
      note: null,
      position: index,
    }))
    .filter((row) => Number.isInteger(row.itemId) && row.itemId > 0);
}

/** Ids de los extras marcados en el formulario del servicio. */
function readExtras(formData: FormData): number[] {
  return formData
    .getAll("extraId")
    .map((raw) => Number(raw))
    .filter((id) => Number.isInteger(id) && id > 0);
}

/** Ids de las localidades marcadas en el formulario del servicio. */
function readLocations(formData: FormData): number[] {
  return formData
    .getAll("locationId")
    .map((raw) => Number(raw))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function readServiceInput(formData: FormData): ServiceInput {
  const duration = toNullable(formData.get("durationMinutes"));
  const seats = toNullable(formData.get("seatsPerBooking"));

  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    type: formData.get("type") === "standalone" ? "standalone" : "promotion",
    tagline: toNullable(formData.get("tagline")),
    description: toNullable(formData.get("description")),
    priceAmount: String(formData.get("priceAmount") ?? "").trim(),
    currency: formData.get("currency") === "USD" ? "USD" : "EUR",
    people: Number(formData.get("people") ?? 1),
    seatsPerBooking: seats === null ? null : Number(seats),
    priceNote: toNullable(formData.get("priceNote")),
    durationMinutes: duration === null ? null : Number(duration),
    badge: toNullable(formData.get("badge")),
    image: toNullable(formData.get("image")),
    flyer: toNullable(formData.get("flyer")),
    position: Number(formData.get("position") ?? 0),
    isActive: formData.get("isActive") === "on",
    showOnHome: formData.get("showOnHome") === "on",
    inclusions: readInclusions(formData),
    extras: readExtras(formData),
    locationIds: readLocations(formData),
  };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Escribe tu correo y tu contraseña." };
  }

  const result = await login(email, password);
  if (!result.ok) {
    return { message: result.error };
  }

  if (!result.isAdmin) {
    // Credenciales correctas pero de cliente: se le manda a su área en vez de
    // dejarle en un panel que no puede usar.
    redirect("/cuenta");
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearToken();
  redirect("/admin/login");
}

export async function saveServiceAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = readServiceInput(formData);

  try {
    const result = id === null ? await createService(input) : await updateService(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  redirect("/admin");
}

/** Guarda el orden que ha dejado el arrastre en el listado. */
export async function reorderServicesAction(
  ids: number[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ids.length === 0) {
    return { ok: false, error: "No hay nada que ordenar." };
  }

  try {
    const result = await reorderServices(ids);
    if (!result.ok) {
      return { ok: false, error: result.errors._ ?? result.errors.order ?? "No se pudo guardar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  return { ok: true };
}

/** Interruptor rápido del listado: publicar u ocultar en la portada. */
export async function toggleHomeAction(
  id: number,
  showOnHome: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const result = await updateService(id, { showOnHome });
    if (!result.ok) {
      return { ok: false, error: result.errors._ ?? "No se pudo guardar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  return { ok: true };
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));

  try {
    await deleteService(id);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  redirect("/admin");
}

export async function saveItemAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    slug: String(formData.get("slug") ?? "").trim(),
    defaultLabel: String(formData.get("defaultLabel") ?? "").trim(),
    icon: String(formData.get("icon") ?? "check").trim(),
    iconPath: toNullable(formData.get("iconPath")),
    position: Number(formData.get("position") ?? 0),
  };

  try {
    const result = id === null ? await createItem(input) : await updateItem(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  redirect("/admin/inclusiones");
}

export async function deleteItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));

  try {
    const result = await deleteItem(id);
    if (!result.ok) {
      // El backend responde 409 cuando el elemento está en uso.
      return { message: result.errors._ ?? "No se pudo borrar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  return { message: "Elemento borrado." };
}

export async function saveExtraAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    priceAmount: String(formData.get("priceAmount") ?? "").trim(),
    currency: (formData.get("currency") === "USD" ? "USD" : "EUR") as "USD" | "EUR",
    icon: String(formData.get("icon") ?? "check").trim() || "check",
    note: toNullable(formData.get("note")),
    position: Number(formData.get("position") ?? 0),
    isActive: formData.get("isActive") === "on",
  };

  try {
    const result = id === null ? await createExtra(input) : await updateExtra(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  redirect("/admin/extras");
}

export async function deleteExtraAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));

  try {
    const result = await deleteExtra(id);
    if (!result.ok) {
      // El backend responde 409 cuando el extra está en uso.
      return { message: result.errors._ ?? "No se pudo borrar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  return { message: "Extra borrado." };
}

export async function saveLocationAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    region: toNullable(formData.get("region")),
    badge: toNullable(formData.get("badge")),
    description: toNullable(formData.get("description")),
    position: Number(formData.get("position") ?? 0),
    isActive: formData.get("isActive") === "on",
  };

  try {
    const result = id === null ? await createLocation(input) : await updateLocation(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  redirect("/admin/localidades");
}

export async function deleteLocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));

  try {
    const result = await deleteLocation(id);
    if (!result.ok) {
      // El backend responde 409 cuando la zona tiene servicios o disponibilidad.
      return { message: result.errors._ ?? "No se pudo borrar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  return { message: "Localidad borrada." };
}

export async function saveSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    companionFeeAmount: String(formData.get("companionFeeAmount") ?? "").trim(),
    companionFeeCurrency: (formData.get("companionFeeCurrency") === "USD" ? "USD" : "EUR") as
      | "USD"
      | "EUR",
    weekdayFreePerFlyer: Number(formData.get("weekdayFreePerFlyer") ?? 0),
  };

  try {
    const result = await updateAdminSettings(input);
    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePath("/reserva");
  revalidatePath("/admin/ajustes");
  return { message: "Ajustes guardados." };
}

/** Sube una imagen y devuelve su ruta para que el formulario la guarde. */
export async function uploadImageAction(
  folder: "services" | "flyers" | "icons",
  formData: FormData,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elige un archivo." };
  }

  try {
    return await uploadImage(file, folder);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }
}
