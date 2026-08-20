import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Sirve y borra un elemento de la galería del vuelo desde el panel.
 *
 * Un <img>/<video> no puede llevar cabecera Authorization y el token vive en
 * la cookie httpOnly, así que el GET lee la cookie, añade el Bearer y devuelve
 * el stream. A diferencia del proxy de comprobantes, aquí se REENVÍA la
 * cabecera Range y se propaga el 206 del backend: sin eso los vídeos no
 * permiten saltar de posición.
 */
// Tipo explícito del contexto en vez de RouteContext<…>: la unión generada por
// Next tarda en incluir esta ruta nueva, pero su forma en runtime es esta.
type Ctx = { params: Promise<{ id: string; mediaId: string }> };

async function checked(context: Ctx): Promise<{ token: string; id: string; mediaId: string } | NextResponse> {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const { id, mediaId } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(mediaId)) {
    return NextResponse.json({ error: { code: "invalid_params" } }, { status: 400 });
  }

  return { token, id, mediaId };
}

export async function GET(request: NextRequest, context: Ctx) {
  const ok = await checked(context);
  if (ok instanceof NextResponse) return ok;
  const { token, id, mediaId } = ok;

  const range = request.headers.get("range");
  // ?download=1 se reenvía: el backend responde con Content-Disposition attachment.
  const download = request.nextUrl.searchParams.get("download") === "1" ? "?download=1" : "";
  const upstream = await fetch(`${BACKEND_URL}/api/admin/bookings/${id}/media/${mediaId}/file${download}`, {
    headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: { code: "not_found" } }, { status: upstream.status });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
    "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "inline",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  for (const name of ["Content-Length", "Content-Range", "Accept-Ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // upstream.status conserva el 206 de las respuestas parciales.
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const ok = await checked(context);
  if (ok instanceof NextResponse) return ok;
  const { token, id, mediaId } = ok;

  const upstream = await fetch(`${BACKEND_URL}/api/admin/bookings/${id}/media/${mediaId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const body = await upstream.json().catch(() => null);

  return NextResponse.json(body ?? { error: { code: "upstream", message: "Respuesta inválida." } }, {
    status: upstream.status,
  });
}
