import { redirect } from "next/navigation";
import { saveServiceAction } from "../../actions";
import { ServiceForm } from "../ServiceForm";
import { listExtras, listItems, listLocations, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function NuevoServicioPage() {
  await requireAdmin();

  let items;
  let extras;
  let locations;
  try {
    [items, extras, locations] = await Promise.all([listItems(), listExtras(), listLocations()]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  const action = saveServiceAction.bind(null, null);

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-title">Nuevo servicio</h1>
      </div>
      <ServiceForm service={null} items={items} extras={extras} locations={locations} action={action} />
    </>
  );
}
