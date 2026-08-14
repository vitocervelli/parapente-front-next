import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/** Mismo proxy que el del cliente, para la bandeja del panel. */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/admin/reservas/[id]/comprobante/[proofId]">,
) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const { id, proofId } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(proofId)) {
    return NextResponse.json({ error: { code: "invalid_params" } }, { status: 400 });
  }

  const upstream = await fetch(`${BACKEND_URL}/api/admin/bookings/${id}/proofs/${proofId}/file`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

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
