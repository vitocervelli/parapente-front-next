import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth";

/**
 * Entrega el token de la sesión al navegador para subir archivos DIRECTAMENTE al
 * backend, sin pasar por Vercel (cuyas funciones limitan el cuerpo a ~4,5 MB, y
 * los Server Actions a 1 MB). Así una foto o un vídeo de hasta 100 MB viaja del
 * navegador al backend sin topes intermedios.
 *
 * Solo responde a la propia sesión: el token vive en una cookie httpOnly que el
 * navegador envía sola en esta petición mismo-origen; si no hay sesión, 401.
 */
export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Tu sesión ha caducado. Vuelve a entrar." } },
      { status: 401 },
    );
  }

  // no-store: el token no debe quedar cacheado en ninguna capa intermedia.
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
