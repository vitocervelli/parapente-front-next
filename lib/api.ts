export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export type ServiceType = "standalone" | "promotion";

/** Una zona de vuelo (Nirgua, La Guaira, Mérida…). */
export type Location = {
  id: number;
  slug: string;
  name: string;
  region: string | null;
  badge: string | null;
  description: string | null;
  position: number;
  isActive: boolean;
};

/** Referencia ligera a una zona, embebida en cada servicio. */
export type ServiceLocation = { id: number; slug: string; name: string };

export type Inclusion = {
  id: number;
  itemId: number | null;
  itemSlug: string | null;
  label: string;
  labelOverride: string | null;
  icon: string;
  iconPath: string | null;
  note: string | null;
  position: number;
};

/** Un extra de pago que ofrece un servicio (p. ej. "paseo a caballo"). */
export type ServiceExtra = {
  /** Id del extra en el catálogo. */
  id: number;
  slug: string | null;
  name: string;
  price: { amount: string; currency: "USD" | "EUR"; display: string };
  icon: string;
  note: string | null;
  position: number;
};

export type Service = {
  id: number;
  slug: string;
  name: string;
  type: ServiceType;
  tagline: string | null;
  description: string | null;
  price: { amount: string; currency: "USD" | "EUR"; display: string };
  people: number;
  /** Plazas del cupo que consume una unidad. Si no se fija, es igual a `people`. */
  seatsPerBooking: number;
  /** La guardada tal cual; null significa "derivar de people". */
  seatsPerBookingRaw: number | null;
  /** Nota efectiva: la guardada o una derivada del nº de personas. */
  priceNote: string;
  /** La guardada tal cual; el panel la necesita para distinguirla de la derivada. */
  priceNoteRaw: string | null;
  durationMinutes: number | null;
  badge: string | null;
  image: string | null;
  flyer: string | null;
  position: number;
  isActive: boolean;
  /** Si ocupa sitio en el mosaico de la portada. */
  showOnHome: boolean;
  inclusionsCount: number;
  inclusions: Inclusion[];
  /** Extras de pago que se pueden añadir por persona en la reserva. */
  extras: ServiceExtra[];
  /** Zonas donde se ofrece el servicio. */
  locations: ServiceLocation[];
  /** Ids de zona sueltos, para el formulario del panel. */
  locationIds: number[];
};

/** Política de acompañantes y otros ajustes globales de reserva. */
export type BookingSettings = {
  companionFee: { amount: string; currency: "USD" | "EUR"; display: string };
  /** Acompañantes gratis por pasajero entre semana (fin de semana: 0). */
  weekdayFreePerFlyer: number;
};

/** Antepone el host del backend a una ruta relativa de /uploads. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
}

/**
 * El catálogo cambia poco y se edita desde el panel, que revalida por ruta.
 * Los 5 minutos son solo la red de seguridad.
 */
const REVALIDATE_SECONDS = 300;

/**
 * Si el backend no responde devolvemos una lista vacía en vez de propagar el
 * error: la web se sigue construyendo y sirviendo, solo sin catálogo.
 */
export async function getServices(
  options: { type?: ServiceType; onlyHome?: boolean; location?: string } = {},
): Promise<Service[]> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.onlyHome) params.set("home", "1");
  if (options.location) params.set("location", options.location);
  const query = params.size > 0 ? `?${params}` : "";

  try {
    const res = await fetch(`${BACKEND_URL}/api/services${query}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["services"] },
    });

    if (!res.ok) {
      console.error(`[api] GET /api/services devolvió ${res.status}`);
      return [];
    }

    const body = (await res.json()) as { data: Service[] };
    return body.data;
  } catch (error) {
    console.error("[api] No se pudo contactar con el backend:", error);
    return [];
  }
}

/**
 * Cifras públicas de la portada. Si el backend falla, devuelve null y la home
 * usa su valor de reserva: nunca rompe el render.
 */
export async function getStats(): Promise<{ peopleFlown: number } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/stats`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["stats"] },
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { data: { peopleFlown: number } };
    return body.data;
  } catch (error) {
    console.error("[api] No se pudieron leer las cifras:", error);
    return null;
  }
}

/**
 * Ajustes globales de reserva (política de acompañantes). Si el backend falla,
 * devuelve un valor de reserva sensato para no romper el asistente de reserva.
 */
export async function getSettings(): Promise<BookingSettings> {
  const fallback: BookingSettings = {
    companionFee: { amount: "0.00", currency: "EUR", display: "0€" },
    weekdayFreePerFlyer: 1,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/settings`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["settings"] },
    });

    if (!res.ok) return fallback;

    const body = (await res.json()) as { data: BookingSettings };
    return body.data;
  } catch (error) {
    console.error("[api] No se pudieron leer los ajustes:", error);
    return fallback;
  }
}

/**
 * Zonas de vuelo activas. Si el backend falla devuelve lista vacía: la web se
 * sigue sirviendo (sin agrupación por zona) en vez de romper el render.
 */
export async function getLocations(): Promise<Location[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/locations`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["locations"] },
    });

    if (!res.ok) return [];

    const body = (await res.json()) as { data: Location[] };
    return body.data;
  } catch (error) {
    console.error("[api] No se pudieron leer las localidades:", error);
    return [];
  }
}

export async function getService(slug: string): Promise<Service | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/services/${slug}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["services"] },
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { data: Service };
    return body.data;
  } catch (error) {
    console.error("[api] No se pudo contactar con el backend:", error);
    return null;
  }
}
