import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Sirve al cliente una foto o vídeo de su vuelo.
 *
 * Un <img>/<video> no puede llevar cabecera Authorization y el token vive en
 * la cookie httpOnly, así que este handler la lee, añade el Bearer y devuelve
 * el stream. Se reenvía la cabecera Range y se propaga el 206 del backend para
 * que los vídeos permitan saltar de posición. La autorización real es la del
 * backend: solo el dueño de la reserva llega al fichero.
 */
// Tipo explícito del contexto en vez de RouteContext<…>: la unión generada por
// Next tarda en incluir esta ruta nueva, pero su forma en runtime es esta.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string; mediaId: string }> },
) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const { reference, mediaId } = await context.params;
  if (!/^[A-Z0-9-]+$/.test(reference) || !/^\d+$/.test(mediaId)) {
    return NextResponse.json({ error: { code: "invalid_params" } }, { status: 400 });
  }

  const range = request.headers.get("range");
  // ?download=1 se reenvía: el backend responde con Content-Disposition attachment.
  const download = request.nextUrl.searchParams.get("download") === "1" ? "?download=1" : "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/account/bookings/${reference}/media/${mediaId}/file${download}`,
    {
      headers: { Authorization: `Bearer ${token}`, ...(range ? { Range: range } : {}) },
      cache: "no-store",
    },
  );

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
