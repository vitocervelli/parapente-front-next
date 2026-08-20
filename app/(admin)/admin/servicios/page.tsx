import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceList } from "../ServiceList";
import { listServices, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function ServiciosPage() {
  await requireAdmin();

  let services;
  try {
    services = await listServices();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  const enPortada = services.filter((s) => s.showOnHome && s.isActive).length;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Servicios</h1>
          <p className="adm-sub">
            {services.length} en total, {enPortada} en la portada. El orden de esta lista es el
            orden en que salen en la web.
          </p>
        </div>
        <Link href="/admin/servicios/nuevo" className="adm-btn adm-btn--primary">
          Nuevo servicio
        </Link>
      </div>

      {services.length === 0 ? (
        <p className="adm-empty">Todavía no hay servicios. Crea el primero.</p>
      ) : (
        <ServiceList services={services} />
      )}
    </>
  );
}
