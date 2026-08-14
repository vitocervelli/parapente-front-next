import { BACKEND_URL } from "./api";

export type Slot = {
  id: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  label: string; // "09:00–10:00"
  capacity: number;
  seatsFree: number;
  isOpen: boolean;
  note: string | null;
  /** Solo en las respuestas del panel. */
  seatsBooked?: number;
};

export type AvailabilityDay = { date: string; slots: Slot[] };

/** Fecha local en YYYY-MM-DD, sin pasar por UTC (toISOString desplazaría el día). */
export function toDateKey(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mes}-${dia}`;
}

/** Interpreta YYYY-MM-DD como fecha local, no UTC. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function formatDayLong(key: string): string {
  const d = fromDateKey(key);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function formatMonth(year: number, month: number): string {
  return `${MESES[month]} de ${year}`;
}

/**
 * Disponibilidad pública de una zona en un rango. Degrada a lista vacía si el
 * backend cae o no se indica localidad.
 */
export async function getAvailability(
  from: string,
  to: string,
  location: string,
): Promise<AvailabilityDay[]> {
  if (!location) return [];
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/availability?location=${encodeURIComponent(location)}&from=${from}&to=${to}`,
      {
        // El cupo cambia con cada reserva: nunca se sirve de caché.
        cache: "no-store",
      },
    );

    if (!res.ok) return [];

    const body = (await res.json()) as { data: AvailabilityDay[] };
    return body.data;
  } catch (error) {
    console.error("[availability] No se pudo contactar con el backend:", error);
    return [];
  }
}
