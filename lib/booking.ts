import type { BookingSettings } from "./api";
import { fromDateKey, type Slot } from "./availability";

/** Un extra de pago disponible en una línea (copiado del servicio). */
export type DraftExtra = {
  id: number;
  name: string;
  priceAmount: string;
  currency: "USD" | "EUR";
  display: string;
  icon: string;
};

/** Una línea del borrador: un servicio en una franja, con sus asistentes. */
export type DraftAttendee = {
  fullName: string;
  idNumber: string;
  email: string;
  phone?: string;
  weightKg?: string;
  /** Ids de los extras que este asistente ha elegido. */
  extraIds: number[];
};

export type DraftLine = {
  /** Identificador local del borrador, no del servidor. */
  key: string;
  serviceId: number;
  serviceName: string;
  serviceSlug: string;
  priceDisplay: string;
  priceAmount: string;
  currency: "USD" | "EUR";
  people: number;
  seatsPerBooking: number;
  quantity: number;
  slot: Slot;
  attendees: DraftAttendee[];
  /** Extras de pago que ofrece el servicio de esta línea. */
  extras: DraftExtra[];
  /** Acompañantes que no vuelan declarados en esta línea. */
  companionCount: number;
};

export type Draft = {
  lines: DraftLine[];
  contactPhone: string;
  note: string;
  /** Zona de la reserva. Se fija al añadir la primera línea; una reserva = una zona. */
  locationSlug: string | null;
};

export const EMPTY_DRAFT: Draft = { lines: [], contactPhone: "", note: "", locationSlug: null };

const STORAGE_KEY = "pbv_reserva_borrador";

/**
 * El borrador vive en sessionStorage: el proceso tiene varios pasos y puede
 * durar más que la hora de vida del token, así que no puede perderse por una
 * recarga ni por tener que iniciar sesión a mitad.
 */
export function loadDraft(): Draft {
  if (typeof window === "undefined") return EMPTY_DRAFT;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;

    const parsed = JSON.parse(raw) as Draft;
    if (!Array.isArray(parsed.lines)) return EMPTY_DRAFT;

    // Rellena los campos que pudieran faltar en borradores guardados por una
    // versión anterior (extras/acompañantes), para no romper el cálculo.
    const lines = parsed.lines.map((l) => ({
      ...l,
      extras: Array.isArray(l.extras) ? l.extras : [],
      companionCount: typeof l.companionCount === "number" ? l.companionCount : 0,
      attendees: (l.attendees ?? []).map((a) => ({
        ...a,
        extraIds: Array.isArray(a.extraIds) ? a.extraIds : [],
      })),
    }));

    const locationSlug =
      typeof parsed.locationSlug === "string" ? parsed.locationSlug : null;

    return { ...EMPTY_DRAFT, ...parsed, lines, locationSlug };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Modo privado o cuota llena: el borrador solo vive en memoria.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/** Asistentes vacíos para una línea, según personas × cantidad. */
export function emptyAttendees(count: number): DraftAttendee[] {
  return Array.from({ length: count }, () => ({
    fullName: "",
    idNumber: "",
    email: "",
    extraIds: [],
  }));
}

export function lineSeats(line: DraftLine): number {
  return line.quantity * line.seatsPerBooking;
}

export function draftSeats(draft: Draft): number {
  return draft.lines.reduce((n, l) => n + lineSeats(l), 0);
}

/**
 * Plazas que el borrador ya tiene apartadas en una franja.
 *
 * Es la pieza que faltaba: `slot.seatsFree` viene del servidor y no sabe nada
 * de lo que llevas en el carrito, así que sin descontarlo se podía pedir mucho
 * más de lo que cabe.
 */
export function seatsTakenInSlot(draft: Draft, slotId: number): number {
  return draft.lines
    .filter((l) => l.slot.id === slotId)
    .reduce((n, l) => n + lineSeats(l), 0);
}

/** Plazas realmente disponibles en una franja para quien está reservando. */
export function seatsAvailable(draft: Draft, slot: Slot): number {
  return Math.max(0, slot.seatsFree - seatsTakenInSlot(draft, slot.id));
}

/** La moneda de la reserva: la de la primera línea, o null si está vacía. */
export function draftCurrency(draft: Draft): "USD" | "EUR" | null {
  return draft.lines[0]?.currency ?? null;
}

/**
 * Añade una línea al borrador, o suma a la que ya existe para el mismo
 * servicio y la misma franja. Sin esto, repetir la misma selección llenaba el
 * resumen de líneas idénticas.
 */
export function addLine(draft: Draft, nueva: DraftLine): Draft {
  const iguales = (l: DraftLine) =>
    l.serviceId === nueva.serviceId && l.slot.id === nueva.slot.id;

  const existente = draft.lines.find(iguales);

  if (!existente) {
    return { ...draft, lines: [...draft.lines, nueva] };
  }

  const cantidad = existente.quantity + nueva.quantity;

  return {
    ...draft,
    lines: draft.lines.map((l) =>
      iguales(l)
        ? {
            ...l,
            quantity: cantidad,
            // Se conservan los asistentes ya escritos y se añaden los que faltan.
            attendees: [
              ...l.attendees,
              ...emptyAttendees(cantidad * l.people - l.attendees.length),
            ],
          }
        : l,
    ),
  };
}

export function removeLine(draft: Draft, key: string): Draft {
  const lines = draft.lines.filter((l) => l.key !== key);
  // Sin líneas, la zona vuelve a quedar libre para elegir otra.
  return { ...draft, lines, locationSlug: lines.length === 0 ? null : draft.locationSlug };
}

/** Cambia la cantidad de una línea, ajustando sus asistentes. */
export function setLineQuantity(draft: Draft, key: string, quantity: number): Draft {
  if (quantity < 1) return removeLine(draft, key);

  return {
    ...draft,
    lines: draft.lines.map((l) => {
      if (l.key !== key) return l;

      const necesarios = quantity * l.people;

      return {
        ...l,
        quantity,
        attendees:
          necesarios > l.attendees.length
            ? [...l.attendees, ...emptyAttendees(necesarios - l.attendees.length)]
            : l.attendees.slice(0, necesarios),
      };
    }),
  };
}

/** Céntimos enteros a partir de un importe string ("20", "20.50"). Nunca float en el total. */
function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

/** Da formato a un importe en céntimos con la moneda del borrador. */
export function formatMoney(centimos: number, currency: "USD" | "EUR"): string {
  const importe = (centimos / 100).toFixed(2).replace(/\.00$/, "");
  return currency === "EUR" ? `${importe.replace(".", ",")}€` : `$${importe}`;
}

/** El sábado y el domingo cuentan como fin de semana (sin acompañante gratis). */
export function isWeekendKey(dateKey: string): boolean {
  const day = fromDateKey(dateKey).getDay();
  return day === 0 || day === 6;
}

/** Céntimos de los extras elegidos por todos los asistentes de la línea. */
export function lineExtrasCents(line: DraftLine): number {
  const precioPorId = new Map(line.extras.map((e) => [e.id, toCents(e.priceAmount)]));
  return line.attendees.reduce(
    (sum, a) => sum + a.extraIds.reduce((s, id) => s + (precioPorId.get(id) ?? 0), 0),
    0,
  );
}

/**
 * Acompañantes de pago y su importe en una línea, según la política:
 * entre semana, `weekdayFreePerFlyer` gratis por pasajero; fin de semana, ninguno.
 */
export function companionInfo(
  line: DraftLine,
  settings: BookingSettings | null,
): { count: number; chargeable: number; cents: number } {
  const count = Math.max(0, line.companionCount);
  if (!settings || count === 0) return { count, chargeable: 0, cents: 0 };

  const flyers = line.attendees.length;
  const allowance = isWeekendKey(line.slot.date)
    ? 0
    : settings.weekdayFreePerFlyer * flyers;
  const chargeable = Math.max(0, count - allowance);

  return { count, chargeable, cents: chargeable * toCents(settings.companionFee.amount) };
}

/**
 * Total del borrador (servicio + extras + acompañantes). Devuelve null si hay
 * monedas mezcladas: sumarlas mentiría.
 */
export function draftTotal(
  draft: Draft,
  settings: BookingSettings | null = null,
): { display: string; currency: string } | null {
  const currency = draftCurrency(draft);
  if (!currency) return null;

  if (draft.lines.some((l) => l.currency !== currency)) return null;

  const centimos = draft.lines.reduce((sum, l) => {
    const base = toCents(l.priceAmount) * l.quantity;
    return sum + base + lineExtrasCents(l) + companionInfo(l, settings).cents;
  }, 0);

  return { currency, display: formatMoney(centimos, currency) };
}

/**
 * El peso es opcional, pero si se rellena tiene que ser creíble. Mismo rango
 * que valida el backend: comprobarlo aquí evita llegar al final del proceso
 * para descubrirlo.
 */
export function weightProblem(weightKg: string | undefined): string | null {
  const texto = weightKg?.trim() ?? "";
  if (texto === "") return null;

  const peso = Number(texto);
  if (!Number.isFinite(peso) || peso < 20 || peso > 200) {
    return "Entre 20 y 200 kg, o déjalo vacío.";
  }

  return null;
}

/**
 * El correo también lo valida el backend (`Assert\Email`). Comprobar el formato
 * aquí evita mandar la reserva entera para que la rechacen por una errata.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailProblem(email: string): string | null {
  const texto = email.trim();
  if (texto === "") return "Hace falta el correo.";
  if (!EMAIL_RE.test(texto)) return "Ese correo no parece válido.";

  return null;
}

/** Errores por campo de un asistente, para pintarlos junto al input. */
export type AttendeeErrors = Partial<
  Record<"fullName" | "idNumber" | "email" | "weightKg", string>
>;

export function attendeeErrors(a: DraftAttendee): AttendeeErrors {
  const errores: AttendeeErrors = {};

  if (!a.fullName.trim()) errores.fullName = "Hace falta el nombre.";
  if (!a.idNumber.trim()) errores.idNumber = "Hace falta la cédula.";

  const correo = emailProblem(a.email);
  if (correo) errores.email = correo;

  const peso = weightProblem(a.weightKg);
  if (peso) errores.weightKg = peso;

  return errores;
}

export const STEPS = 3;

/**
 * Qué falta en un paso concreto.
 *
 * Está partido por pasos a propósito: el asistente comprueba cada paso antes de
 * dejar avanzar, en lugar de acumular todos los fallos hasta el final, que es
 * donde ya no se ven los campos que hay que corregir.
 */
export function stepProblems(draft: Draft, step: number): string[] {
  const problemas: string[] = [];

  if (step === 0) {
    if (draft.lines.length === 0) {
      problemas.push("Elige al menos un vuelo.");
    }

    if (draftTotal(draft) === null && draft.lines.length > 0) {
      problemas.push("No se pueden mezclar servicios en euros y en dólares en la misma reserva.");
    }
  }

  if (step === 1) {
    for (const line of draft.lines) {
      line.attendees.forEach((a, i) => {
        const quien = `${line.serviceName}, persona ${i + 1}`;
        const errores = attendeeErrors(a);

        if (errores.fullName) problemas.push(`Falta el nombre de ${quien}.`);
        if (errores.idNumber) problemas.push(`Falta la cédula de ${quien}.`);
        if (errores.email) {
          problemas.push(
            a.email.trim() === ""
              ? `Falta el correo de ${quien}.`
              : `El correo de ${quien} no es válido.`,
          );
        }
        if (errores.weightKg) {
          problemas.push(`El peso de ${quien} no es válido (20–200 kg).`);
        }
      });
    }
  }

  return problemas;
}

/** Qué falta por rellenar antes de poder enviar, mirando todos los pasos. */
export function draftProblems(draft: Draft): string[] {
  return Array.from({ length: STEPS }, (_, i) => stepProblems(draft, i)).flat();
}

/** Primer paso que tiene algo pendiente, o null si está todo listo. */
export function firstStepWithProblems(draft: Draft): number | null {
  for (let i = 0; i < STEPS; i++) {
    if (stepProblems(draft, i).length > 0) return i;
  }

  return null;
}
