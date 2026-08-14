import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Sirve el fichero del comprobante al navegador.
 *
 * Un <img> no puede llevar cabecera Authorization y el token vive solo en la
 * cookie httpOnly del servidor, así que este handler la lee, añade el Bearer y
 * devuelve el stream tal cual. La autorización real sigue siendo la del
 * backend (solo el dueño de la reserva llega al fichero).
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/cuenta/reservas/[reference]/comprobante/[proofId]">,
) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const { reference, proofId } = await context.params;
  if (!/^[A-Z0-9-]+$/.test(reference) || !/^\d+$/.test(proofId)) {
    return NextResponse.json({ error: { code: "invalid_params" } }, { status: 400 });
  }

  const upstream = await fetch(
    `${BACKEND_URL}/api/account/bookings/${reference}/proofs/${proofId}/file`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: { code: "not_found" } }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
