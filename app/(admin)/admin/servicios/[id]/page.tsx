import { notFound, redirect } from "next/navigation";
import { saveServiceAction } from "../../actions";
import { ServiceForm } from "../ServiceForm";
import {
  getServiceById,
  listExtras,
  listItems,
  listLocations,
  UnauthorizedError,
} from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function EditarServicioPage({ params }: PageProps<"/admin/servicios/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    notFound();
  }

  let service;
  let items;
  let extras;
  let locations;
  try {
    [service, items, extras, locations] = await Promise.all([
      getServiceById(numericId),
      listItems(),
      listExtras(),
      listLocations(),
    ]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  if (!service) {
    notFound();
  }

  const action = saveServiceAction.bind(null, numericId);

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-title">{service.name}</h1>
        <span className="adm-sub">/{service.slug}</span>
      </div>
      <ServiceForm
        service={service}
        items={items}
        extras={extras}
        locations={locations}
        action={action}
      />
    </>
  );
}
