// Catálogos del formulario de embajadores. Las claves coinciden con las de
// App\Entity\InfluencerLead en el backend: el formulario envía la clave y el
// panel muestra la etiqueta. Sin dependencias de servidor: vale en cliente.

export const REDES = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/tuusuario" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@tuusuario" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@tucanal" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/tupagina" },
  { key: "x", label: "X (Twitter)", placeholder: "x.com/tuusuario" },
  { key: "twitch", label: "Twitch", placeholder: "twitch.tv/tucanal" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/tuperfil" },
  { key: "other", label: "Otra", placeholder: "https://tuweb.com" },
] as const;

export const NICHOS = [
  { key: "travel", label: "Viajes" },
  { key: "sport", label: "Deporte y aventura" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "food", label: "Gastronomía" },
  { key: "photo", label: "Fotografía y vídeo" },
  { key: "other", label: "Otro" },
] as const;

export const COLABORACIONES = [
  { key: "flight_exchange", label: "Canje por vuelo" },
  { key: "paid_content", label: "Contenido pagado" },
  { key: "ambassador", label: "Embajador de marca" },
  { key: "other", label: "Otra" },
] as const;

export const ESTADOS_LEAD = [
  { key: "new", label: "Nueva", tono: "res-estado--espera" },
  { key: "contacted", label: "Contactada", tono: "res-estado--aviso" },
  { key: "agreement", label: "Acuerdo", tono: "res-estado--ok" },
  { key: "discarded", label: "Descartada", tono: "res-estado--no" },
] as const;

export type RedKey = (typeof REDES)[number]["key"];
export type EstadoLead = (typeof ESTADOS_LEAD)[number]["key"];

/** Etiqueta legible de una clave de catálogo (o la propia clave si no existe). */
export function etiqueta(catalogo: readonly { key: string; label: string }[], key: string): string {
  return catalogo.find((c) => c.key === key)?.label ?? key;
}

/** 12500 → «12,5 mil», 1200000 → «1,2 M». */
export function formatSeguidores(n: number | null): string {
  if (n === null) return "";
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} mil`;
  return String(n);
}

// ── Envío del formulario ─────────────────────────────────────────────────────

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export type EmbajadorInput = {
  firstName: string;
  lastName: string;
  age: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  socials: { network: string; url: string; followers: string }[];
  niches: string[];
  collaborationTypes: string[];
  comments: string;
  consent: boolean;
  /** Campo trampa para bots: una persona nunca lo rellena. */
  website: string;
};

export type EmbajadorResult =
  | { ok: true }
  | { ok: false; errors?: Record<string, string>; message?: string };

/**
 * Envía la solicitud DESDE EL NAVEGADOR directamente al backend (endpoint
 * público, sin token; el CORS del backend admite el dominio del front).
 *
 * No va por una server action a propósito: así el backend ve la IP real de
 * cada persona y su límite antispam (5 envíos / 15 min por IP) se aplica a cada
 * una por separado. Desde Vercel todas las peticiones compartirían la IP del
 * servidor y el límite bloquearía a todo el mundo a la vez.
 */
export async function enviarSolicitudEmbajador(input: EmbajadorInput): Promise<EmbajadorResult> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/leads/influencer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return {
      ok: false,
      message: "No se pudo contactar con el servidor. Inténtalo de nuevo en un momento.",
    };
  }

  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => null);

  if (res.status === 422 && body && typeof body === "object" && "errors" in body) {
    return { ok: false, errors: body.errors as Record<string, string> };
  }

  const message =
    body && typeof body === "object" && "error" in body
      ? (body.error as { message?: string }).message
      : undefined;

  return { ok: false, message: message ?? "No se pudo enviar la solicitud. Inténtalo de nuevo." };
}
