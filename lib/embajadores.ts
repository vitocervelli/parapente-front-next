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
  /** `id` y `uploadToken` permiten subir los archivos de muestra justo después. */
  | { ok: true; id?: number; uploadToken?: string }
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

  const body = await res.json().catch(() => null);

  if (res.ok) {
    // Si el backend detectó un bot no devuelve id ni token: se da por enviada.
    const data = (body as { data?: { id?: number; uploadToken?: string } } | null)?.data;
    return { ok: true, id: data?.id, uploadToken: data?.uploadToken };
  }

  if (res.status === 422 && body && typeof body === "object" && "errors" in body) {
    return { ok: false, errors: body.errors as Record<string, string> };
  }

  const message =
    body && typeof body === "object" && "error" in body
      ? (body.error as { message?: string }).message
      : undefined;

  return { ok: false, message: message ?? "No se pudo enviar la solicitud. Inténtalo de nuevo." };
}

// ── Archivos de muestra (fotos y vídeos) ─────────────────────────────────────

/** Lo que admite el backend por solicitud y por archivo (ya optimizado). */
export const MAX_ARCHIVOS = 8;
export const MAX_FOTO_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
/** Lo que se deja ELEGIR: los vídeos grandes se recodifican antes de subir. */
export const MAX_FOTO_ORIGINAL_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_ORIGINAL_BYTES = 1024 * 1024 * 1024;

export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const TIPOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Sube UN archivo de muestra directo al backend con el token de subida. Usa
 * XMLHttpRequest y no fetch porque fetch no informa del progreso de subida, y
 * con un vídeo hay que poder enseñarlo. `onProgress` recibe un valor 0–1.
 */
export function subirArchivoEmbajador(
  leadId: number,
  uploadToken: string,
  file: File,
  onProgress?: (p: number) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    const data = new FormData();
    data.append("token", uploadToken);
    data.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BACKEND_URL}/api/leads/influencer/${leadId}/media`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
        return;
      }
      let message = `El servidor respondió ${xhr.status}.`;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        if (xhr.status === 413) message = "El archivo es demasiado pesado.";
      }
      resolve({ ok: false, message });
    };
    xhr.onerror = () => resolve({ ok: false, message: "Se cortó la conexión mientras se subía." });
    xhr.send(data);
  });
}
