import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Sube el vídeo de un reel reenviándolo al backend con el Bearer. Route handler
 * y no server action a propósito: las actions limitan el cuerpo a 1 MB y un
 * vídeo pesa hasta 100 MB. Devuelve la ruta pública donde quedó guardado.
 */
export async function POST(request: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Tu sesión ha caducado. Vuelve a entrar." } },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  formData.set("folder", "reels");

  const upstream = await fetch(`${BACKEND_URL}/api/admin/uploads/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    cache: "no-store",
  });

  const body = await upstream.json().catch(() => null);

  return NextResponse.json(body ?? { error: { code: "upstream", message: "Respuesta inválida." } }, {
    status: upstream.status,
  });
}
