import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * El panel sube un comprobante en nombre del cliente, reenviándolo al backend
 * con el Bearer. Route handler y no server action a propósito: las actions
 * limitan el cuerpo a 1 MB y un PDF pesa más. El token vive en la cookie
 * httpOnly, el navegador nunca lo ve.
 */
// Tipo explícito del contexto en vez de RouteContext<…>: la unión generada por
// Next tarda en incluir esta ruta nueva, pero su forma en runtime es esta.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Tu sesión ha caducado. Vuelve a entrar." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: { code: "invalid_id", message: "Identificador no válido." } },
      { status: 400 },
    );
  }

  const formData = await request.formData();

  const upstream = await fetch(`${BACKEND_URL}/api/admin/bookings/${id}/proofs`, {
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
