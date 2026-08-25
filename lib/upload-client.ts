// Solo navegador: sube archivos DIRECTAMENTE al backend, saltándose Vercel.
//
// Vercel limita el cuerpo de sus funciones a ~4,5 MB (y los Server Actions a
// 1 MB), así que un vídeo de vuelo de hasta 100 MB no puede pasar por ahí. En su
// lugar, el navegador pide el token de la sesión a /session-token y hace el POST
// directo a `NEXT_PUBLIC_BACKEND_URL` con `Authorization: Bearer`. El backend
// (Symfony) admite CORS desde el dominio de Vercel y hasta 120 MB por subida.

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

/** El token dura 1 h; se cachea unos minutos para no pedirlo en cada tanda. */
let cached: { token: string; at: number } | null = null;
const TOKEN_TTL_MS = 5 * 60 * 1000;

async function uploadToken(): Promise<string | null> {
  if (cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token;

  const res = await fetch("/session-token", { cache: "no-store" });
  if (!res.ok) {
    cached = null;
    return null;
  }
  const { token } = (await res.json()) as { token: string };
  cached = { token, at: Date.now() };
  return token;
}

export type UploadResult = { ok: boolean; status: number; body: unknown };

/**
 * POST directo al backend. `path` es la ruta de la API (p. ej.
 * `/api/admin/bookings/12/media`). Devuelve el estado y el cuerpo ya parseado.
 */
export async function uploadDirect(path: string, formData: FormData): Promise<UploadResult> {
  const token = await uploadToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      body: { error: { code: "unauthorized", message: "Tu sesión ha caducado. Vuelve a entrar." } },
    };
  }

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    // Un 401/403 puede venir de un token recién caducado: se limpia la caché.
    if (res.status === 401 || res.status === 403) cached = null;
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch {
    return {
      ok: false,
      status: 0,
      body: { error: { code: "network", message: "No se pudo contactar con el servidor." } },
    };
  }
}

/** Mensaje de error legible a partir del cuerpo de una respuesta fallida. */
export function uploadError(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: { message?: string } }).error?.message;
    if (message) return message;
  }
  return `El servidor respondió ${status}.`;
}

/**
 * Sube una sola imagen a `/api/admin/uploads` y devuelve su ruta. Misma firma y
 * forma de respuesta que el antiguo `uploadImageAction`, para cambiar poco en
 * quien la usa (formularios de servicios, galería, aliados, extras, reels…).
 */
export async function uploadImageDirect(
  folder: "services" | "icons" | "allies" | "gallery" | "reels",
  formData: FormData,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elige un archivo." };
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const res = await uploadDirect("/api/admin/uploads", fd);
  if (!res.ok) {
    return { ok: false, error: uploadError(res.body, res.status) };
  }

  return { ok: true, path: (res.body as { data: { path: string } }).data.path };
}
