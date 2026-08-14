// Solo servidor: lee el token de la cookie httpOnly. No importar desde
// componentes cliente.
import type { Booking } from "./account-api";
import { BACKEND_URL, type Service } from "./api";
import type { AvailabilityDay, Slot } from "./availability";
import { getToken } from "./auth";

/** La vista de admin añade la identidad del cliente y la nota interna. */
export type AdminBooking = Booking & {
  id: number;
  adminNote: string | null;
  /** Retiene plazas pese a haber pasado su plazo de pago o su fecha de vuelo. */
  isOverdue: boolean;
  customer: { id: number; email: string; fullName: string | null; phone: string | null } | null;
};

export type AdminItem = {
  id: number;
  slug: string;
  defaultLabel: string;
  icon: string;
  iconPath: string | null;
  position: number;
};

export type InclusionInput = {
  itemId: number;
  labelOverride: string | null;
  note: string | null;
  position: number;
};

/** Un extra del catálogo, tal como lo edita el panel. */
export type AdminExtra = {
  id: number;
  slug: string;
  name: string;
  price: { amount: string; currency: "USD" | "EUR"; display: string };
  currency: "USD" | "EUR";
  icon: string;
  note: string | null;
  position: number;
  isActive: boolean;
};

export type ExtraInput = {
  slug: string;
  name: string;
  priceAmount: string;
  currency: "USD" | "EUR";
  icon: string;
  note: string | null;
  position: number;
  isActive: boolean;
};

/** Una localidad (zona de vuelo) tal como la edita el panel. */
export type AdminLocation = {
  id: number;
  slug: string;
  name: string;
  region: string | null;
  badge: string | null;
  description: string | null;
  position: number;
  isActive: boolean;
};

export type LocationInput = {
  slug: string;
  name: string;
  region: string | null;
  badge: string | null;
  description: string | null;
  position: number;
  isActive: boolean;
};

/** Ajustes globales de reserva (política de acompañantes). */
export type AdminSettings = {
  companionFee: { amount: string; currency: "USD" | "EUR"; display: string };
  weekdayFreePerFlyer: number;
};

export type SettingsInput = {
  companionFeeAmount: string;
  companionFeeCurrency: "USD" | "EUR";
  weekdayFreePerFlyer: number;
};

export type ServiceInput = {
  name: string;
  slug: string;
  type: "standalone" | "promotion";
  tagline: string | null;
  description: string | null;
  priceAmount: string;
  currency: "USD" | "EUR";
  people: number;
  seatsPerBooking: number | null;
  priceNote: string | null;
  durationMinutes: number | null;
  badge: string | null;
  image: string | null;
  flyer: string | null;
  position: number;
  isActive: boolean;
  showOnHome: boolean;
  inclusions: InclusionInput[];
  /** Ids de los extras del catálogo que ofrece el servicio. */
  extras: number[];
  /** Ids de las localidades donde se ofrece el servicio. */
  locationIds: number[];
};

export class UnauthorizedError extends Error {
  constructor() {
    super("Sesión caducada");
  }
}

/** Errores de validación del backend, indexados por campo. */
export type FieldErrors = Record<string, string>;

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; errors: FieldErrors }> {
  const token = await getToken();
  if (!token) throw new UnauthorizedError();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new UnauthorizedError();
  }

  if (res.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (body && typeof body === "object" && "errors" in body) {
      return { ok: false, errors: body.errors as FieldErrors };
    }
    const message =
      body && typeof body === "object" && "error" in body
        ? (body.error as { message?: string }).message
        : undefined;
    return { ok: false, errors: { _: message ?? `Error ${res.status}` } };
  }

  return { ok: true, data: (body as { data: T }).data };
}

export async function listServices(): Promise<Service[]> {
  const res = await request<Service[]>("/api/admin/services");
  return res.ok ? res.data : [];
}

export async function getServiceById(id: number): Promise<Service | null> {
  const res = await request<Service>(`/api/admin/services/${id}`);
  return res.ok ? res.data : null;
}

export async function listItems(): Promise<AdminItem[]> {
  const res = await request<AdminItem[]>("/api/admin/inclusion-items");
  return res.ok ? res.data : [];
}

export function createService(input: ServiceInput) {
  return request<Service>("/api/admin/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateService(id: number, input: Partial<ServiceInput>) {
  return request<Service>(`/api/admin/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteService(id: number) {
  return request<void>(`/api/admin/services/${id}`, { method: "DELETE" });
}

// ── Localidades ───────────────────────────────────────────────────────────────

export async function listLocations(): Promise<AdminLocation[]> {
  const res = await request<AdminLocation[]>("/api/admin/locations");
  return res.ok ? res.data : [];
}

export function createLocation(input: LocationInput) {
  return request<AdminLocation>("/api/admin/locations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLocation(id: number, input: Partial<LocationInput>) {
  return request<AdminLocation>(`/api/admin/locations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteLocation(id: number) {
  return request<void>(`/api/admin/locations/${id}`, { method: "DELETE" });
}

// ── Disponibilidad (por localidad) ────────────────────────────────────────────

export type SlotInput = {
  startTime: string;
  endTime: string;
  capacity: number;
  isOpen: boolean;
  note: string | null;
};

export async function listAvailability(
  location: string,
  from: string,
  to: string,
): Promise<AvailabilityDay[]> {
  const res = await request<AvailabilityDay[]>(
    `/api/admin/availability?location=${encodeURIComponent(location)}&from=${from}&to=${to}`,
  );
  return res.ok ? res.data : [];
}

/** Reemplaza las franjas de un día entero de una zona. */
export function saveDay(location: string, date: string, slots: SlotInput[]) {
  return request<Slot[]>(
    `/api/admin/availability/day/${date}?location=${encodeURIComponent(location)}`,
    {
      method: "PUT",
      body: JSON.stringify({ slots }),
    },
  );
}

export function copyDay(location: string, from: string, to: string[]) {
  return request<{ created: number; skipped: number }>(
    `/api/admin/availability/copy?location=${encodeURIComponent(location)}`,
    {
      method: "POST",
      body: JSON.stringify({ from, to }),
    },
  );
}

export function updateSlot(id: number, input: Partial<SlotInput>) {
  return request<Slot>(`/api/admin/availability/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSlot(id: number) {
  return request<void>(`/api/admin/availability/${id}`, { method: "DELETE" });
}

// ── Reservas ────────────────────────────────────────────────────────────────

export async function listBookings(statuses: string[] = []): Promise<AdminBooking[]> {
  const query = statuses.length > 0 ? `?status=${statuses.join(",")}` : "";
  const res = await request<AdminBooking[]>(`/api/admin/bookings${query}`);
  return res.ok ? res.data : [];
}

/** Reservas vencidas: retienen plazas pese a haber pasado el plazo de pago. */
export async function listOverdueBookings(): Promise<AdminBooking[]> {
  const res = await request<AdminBooking[]>("/api/admin/bookings?scope=overdue");
  return res.ok ? res.data : [];
}

export async function getBooking(id: number): Promise<AdminBooking | null> {
  const res = await request<AdminBooking>(`/api/admin/bookings/${id}`);
  return res.ok ? res.data : null;
}

/** Un asistente al editarlo: solo el id es obligatorio, el resto es parcial. */
export type AttendeeEdit = {
  id: number;
  fullName?: string;
  idNumber?: string;
  email?: string;
  phone?: string | null;
  weightKg?: string;
};

export type BookingEdit = {
  contactPhone?: string | null;
  customerNote?: string | null;
  adminNote?: string | null;
  attendees?: AttendeeEdit[];
};

/** Edita datos de la reserva (teléfono, notas, asistentes) en cualquier estado. */
export function updateBooking(id: number, input: BookingEdit) {
  return request<AdminBooking>(`/api/admin/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Ajusta un comprobante ya revisado: importe, referencia o nota. */
export function updateProof(
  bookingId: number,
  proofId: number,
  input: { declaredAmount: string | null; transferReference: string | null; note: string | null },
) {
  return request<AdminBooking>(`/api/admin/bookings/${bookingId}/proofs/${proofId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** El importe lo registra el administrador: el cliente solo sube la foto. */
export function acceptProof(
  bookingId: number,
  proofId: number,
  input: { declaredAmount: string; transferReference: string | null; note: string | null },
) {
  return request<AdminBooking>(`/api/admin/bookings/${bookingId}/proofs/${proofId}/accept`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function rejectProof(bookingId: number, proofId: number, note: string) {
  return request<AdminBooking>(`/api/admin/bookings/${bookingId}/proofs/${proofId}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

/** confirm | complete | no-show | reject | cancel */
export function transitionBooking(id: number, action: string, note: string | null = null) {
  return request<AdminBooking>(`/api/admin/bookings/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

/** Aplica el orden completo de una vez: la posición es el índice en el array. */
export function reorderServices(ids: number[]) {
  return request<{ updated: number }>("/api/admin/services/reorder", {
    method: "POST",
    body: JSON.stringify({ order: ids }),
  });
}

export function createItem(input: Omit<AdminItem, "id">) {
  return request<AdminItem>("/api/admin/inclusion-items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateItem(id: number, input: Partial<Omit<AdminItem, "id">>) {
  return request<AdminItem>(`/api/admin/inclusion-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteItem(id: number) {
  return request<void>(`/api/admin/inclusion-items/${id}`, { method: "DELETE" });
}

// ── Extras (catálogo de pago) ─────────────────────────────────────────────────

export async function listExtras(): Promise<AdminExtra[]> {
  const res = await request<AdminExtra[]>("/api/admin/extras");
  return res.ok ? res.data : [];
}

export function createExtra(input: ExtraInput) {
  return request<AdminExtra>("/api/admin/extras", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateExtra(id: number, input: Partial<ExtraInput>) {
  return request<AdminExtra>(`/api/admin/extras/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteExtra(id: number) {
  return request<void>(`/api/admin/extras/${id}`, { method: "DELETE" });
}

// ── Ajustes globales ──────────────────────────────────────────────────────────

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const res = await request<AdminSettings>("/api/admin/settings");
  return res.ok ? res.data : null;
}

export function updateAdminSettings(input: Partial<SettingsInput>) {
  return request<AdminSettings>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Sube una imagen y devuelve la ruta relativa que guarda el servicio. */
export async function uploadImage(
  file: File,
  folder: "services" | "flyers" | "icons",
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const token = await getToken();
  if (!token) throw new UnauthorizedError();

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const res = await fetch(`${BACKEND_URL}/api/admin/uploads`, {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) throw new UnauthorizedError();

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body.error as { message?: string }).message
        : undefined;
    return { ok: false, error: message ?? `Error ${res.status}` };
  }

  return { ok: true, path: (body as { data: { path: string } }).data.path };
}
