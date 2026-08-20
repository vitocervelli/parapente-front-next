"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAlly,
  createExtra,
  createGalleryPhoto,
  createItem,
  createLocation,
  createReel,
  createService,
  deleteAlly,
  deleteExtra,
  deleteGalleryPhoto,
  deleteItem,
  deleteLocation,
  deleteReel,
  deleteService,
  reorderAllies,
  reorderExtras,
  reorderGallery,
  reorderItems,
  reorderLocations,
  reorderReels,
  reorderServices,
  UnauthorizedError,
  updateAdminSettings,
  updateAlly,
  updateExtra,
  updateGalleryPhoto,
  updateReel,
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
  revalidatePath("/admin/servicios");
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
  redirect("/admin/servicios");
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
  redirect("/admin/servicios");
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
    iconPath: toNullable(formData.get("iconPath")),
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

export async function saveAllyAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    name: String(formData.get("name") ?? "").trim(),
    kind: toNullable(formData.get("kind")),
    logoPath: toNullable(formData.get("logoPath")),
    position: Number(formData.get("position") ?? 0),
    isActive: formData.get("isActive") === "on",
  };

  try {
    const result = id === null ? await createAlly(input) : await updateAlly(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  redirect("/admin/aliados");
}

/** Fábrica de las actions de reordenado: todas comparten forma y errores. */
async function runReorder(
  ids: number[],
  send: (ids: number[]) => Promise<{ ok: true; data: { updated: number } } | { ok: false; errors: FieldErrors }>,
  extraPath?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ids.length === 0) {
    return { ok: false, error: "No hay nada que ordenar." };
  }

  try {
    const result = await send(ids);
    if (!result.ok) {
      return { ok: false, error: result.errors._ ?? result.errors.order ?? "No se pudo guardar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  if (extraPath) revalidatePath(extraPath);
  return { ok: true };
}

export async function reorderExtrasAction(ids: number[]) {
  return runReorder(ids, reorderExtras, "/admin/extras");
}

export async function reorderGalleryAction(ids: number[]) {
  const result = await runReorder(ids, reorderGallery, "/admin/galeria");
  revalidatePath("/galeria");
  return result;
}

export async function reorderReelsAction(ids: number[]) {
  const result = await runReorder(ids, reorderReels, "/admin/reels");
  revalidatePath("/");
  return result;
}

export async function saveReelAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    videoPath: String(formData.get("videoPath") ?? "").trim(),
    posterPath: toNullable(formData.get("posterPath")),
    caption: toNullable(formData.get("caption")),
    position: Number(formData.get("position") ?? 0),
    isActive: formData.get("isActive") === "on",
  };

  if (!input.videoPath) {
    return { errors: { videoPath: "Sube un vídeo para el reel." }, message: "Falta el vídeo." };
  }

  try {
    const result = id === null ? await createReel(input) : await updateReel(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePath("/");
  redirect("/admin/reels");
}

export async function deleteReelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));

  try {
    const result = await deleteReel(id);
    if (!result.ok) {
      return { message: result.errors._ ?? "No se pudo borrar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/admin/reels");
  return { message: "Reel borrado." };
}

export async function saveGalleryPhotoAction(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    imagePath: String(formData.get("imagePath") ?? "").trim(),
    alt: String(formData.get("alt") ?? "").trim(),
    isFeatured: formData.get("isFeatured") === "on",
    isWide: formData.get("isWide") === "on",
    position: Number(formData.get("position") ?? 0),
    isActive: formData.get("isActive") === "on",
  };

  try {
    const result =
      id === null ? await createGalleryPhoto(input) : await updateGalleryPhoto(id, input);

    if (!result.ok) {
      return { errors: result.errors, message: result.errors._ ?? "Revisa los campos marcados." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePath("/galeria");
  redirect("/admin/galeria");
}

export async function deleteGalleryPhotoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("id"));

  try {
    const result = await deleteGalleryPhoto(id);
    if (!result.ok) {
      return { message: result.errors._ ?? "No se pudo borrar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePath("/galeria");
  revalidatePath("/admin/galeria");
  return { message: "Foto borrada." };
}

export async function reorderItemsAction(ids: number[]) {
  return runReorder(ids, reorderItems, "/admin/inclusiones");
}

export async function reorderLocationsAction(ids: number[]) {
  return runReorder(ids, reorderLocations, "/admin/localidades");
}

export async function reorderAlliesAction(
  ids: number[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ids.length === 0) {
    return { ok: false, error: "No hay nada que ordenar." };
  }

  try {
    const result = await reorderAllies(ids);
    if (!result.ok) {
      return { ok: false, error: result.errors._ ?? result.errors.order ?? "No se pudo guardar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  revalidatePath("/admin/aliados");
  return { ok: true };
}

export async function deleteAllyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));

  try {
    const result = await deleteAlly(id);
    if (!result.ok) {
      return { message: result.errors._ ?? "No se pudo borrar." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  revalidatePublicPages();
  return { message: "Aliado borrado." };
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
  folder: "services" | "icons" | "allies" | "gallery" | "reels",
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
