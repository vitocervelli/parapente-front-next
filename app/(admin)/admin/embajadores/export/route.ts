import { NextResponse, type NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Descarga del Excel de embajadores. El backend genera el .xlsx y aquí solo se
 * reenvía con el Bearer de la cookie httpOnly (el navegador nunca ve el token).
 * El backend exige ROLE_ADMIN.
 */
export async function GET(request: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const upstream = await fetch(`${BACKEND_URL}/api/admin/influencer-leads/export`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: { code: "export_failed", message: "No se pudo generar el Excel." } },
      { status: upstream.status === 401 || upstream.status === 403 ? 401 : 502 },
    );
  }

  const fallback = `embajadores-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        upstream.headers.get("Content-Disposition") ?? `attachment; filename="${fallback}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
