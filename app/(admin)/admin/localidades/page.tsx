import { redirect } from "next/navigation";
import { LocationsEditor } from "./LocationsEditor";
import { listLocations, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function LocalidadesPage() {
  await requireAdmin();

  let locations;
  try {
    locations = await listLocations();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Localidades</h1>
          <p className="adm-sub">
            Las zonas de vuelo (Nirgua, La Guaira, Mérida…). Cada servicio se asigna a una o varias, y
            cada zona tiene su propio calendario de disponibilidad.
          </p>
        </div>
      </div>
      <LocationsEditor locations={locations} />
    </>
  );
}
