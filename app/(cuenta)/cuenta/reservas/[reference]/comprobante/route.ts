import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Sube el comprobante reenviándolo al backend con el Bearer.
 *
 * Es un route handler y no una server action a propósito: las actions limitan
 * el cuerpo a 1 MB por defecto y un comprobante puede ser un PDF de varios.
 * El token vive en la cookie httpOnly, así que el navegador nunca lo ve.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/cuenta/reservas/[reference]/comprobante">,
) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Tu sesión ha caducado. Vuelve a entrar." } },
      { status: 401 },
    );
  }

  const { reference } = await context.params;
  if (!/^[A-Z0-9-]+$/.test(reference)) {
    return NextResponse.json(
      { error: { code: "invalid_reference", message: "Referencia no válida." } },
      { status: 400 },
    );
  }

  const formData = await request.formData();

  const upstream = await fetch(`${BACKEND_URL}/api/account/bookings/${reference}/proofs`, {
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
