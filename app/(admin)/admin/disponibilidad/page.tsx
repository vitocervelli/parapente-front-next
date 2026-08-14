import { redirect } from "next/navigation";
import { AvailabilityManager } from "./AvailabilityManager";
import { listAvailability, listLocations, UnauthorizedError } from "@/lib/admin-api";
import { toDateKey } from "@/lib/availability";
import { requireAdmin } from "@/lib/auth";

export default async function DisponibilidadPage({
  searchParams,
}: PageProps<"/admin/disponibilidad">) {
  await requireAdmin();

  const { loc } = await searchParams;

  // Se carga el mes actual y los dos siguientes: cubre la vista inicial del
  // calendario y el mes siguiente sin ir al servidor otra vez.
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0);

  let locations;
  try {
    locations = await listLocations();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  // Zona activa: la del parámetro, o la primera disponible.
  const rawLoc = typeof loc === "string" ? loc : undefined;
  const current = locations.find((l) => l.slug === rawLoc) ?? locations[0] ?? null;

  let dias: Awaited<ReturnType<typeof listAvailability>> = [];
  if (current) {
    try {
      dias = await listAvailability(current.slug, toDateKey(desde), toDateKey(hasta));
    } catch (error) {
      if (error instanceof UnauthorizedError) redirect("/admin/login");
      throw error;
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Disponibilidad</h1>
          <p className="adm-sub">
            Las plazas que tienes cada día y a cada hora, por localidad. Elige una zona, luego un día
            en el calendario para montar sus horarios, y cópialos al resto de fines de semana.
          </p>
        </div>
      </div>

      {current ? (
        <AvailabilityManager
          key={current.slug}
          initialDays={dias}
          locations={locations}
          location={current.slug}
        />
      ) : (
        <p className="adm-empty">
          No hay localidades todavía. Créalas en «Localidades» para gestionar su disponibilidad.
        </p>
      )}
    </>
  );
}
