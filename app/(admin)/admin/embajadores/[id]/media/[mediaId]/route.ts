import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Sirve una foto o vídeo de muestra de un embajador al panel.
 *
 * Un <img>/<video> no puede llevar cabecera Authorization y el token vive en la
 * cookie httpOnly: aquí se lee la cookie, se añade el Bearer y se devuelve el
 * stream. Se reenvía la cabecera Range y se propaga el 206 para que el
 * reproductor de vídeo pueda saltar de posición. ?download=1 fuerza la descarga.
 */
// Tipo explícito del contexto: la unión generada por Next tarda en incluir rutas nuevas.
type Ctx = { params: Promise<{ id: string; mediaId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const { id, mediaId } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(mediaId)) {
    return NextResponse.json({ error: { code: "invalid_params" } }, { status: 400 });
  }

  const range = request.headers.get("range");
  const download = request.nextUrl.searchParams.get("download") === "1" ? "?download=1" : "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/admin/influencer-leads/${id}/media/${mediaId}/file${download}`,
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

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
