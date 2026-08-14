import Link from "next/link";
import { redirect } from "next/navigation";
import { NuevaReservaForm } from "./NuevaReservaForm";
import { getAdminSettings, listLocations, listServices, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function NuevaReservaPage() {
  await requireAdmin();

  let services;
  let locations;
  let settings;
  try {
    [services, locations, settings] = await Promise.all([
      listServices(),
      listLocations(),
      getAdminSettings(),
    ]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  const settingsSeguro = settings ?? {
    companionFee: { amount: "0.00", currency: "EUR" as const, display: "0€" },
    weekdayFreePerFlyer: 1,
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Nueva reserva</h1>
          <p className="adm-sub">
            Para cuando un cliente llama por teléfono. Se crea en «pendiente de pago» y respeta el
            cupo, igual que una reserva de la web.
          </p>
        </div>
        <Link href="/admin/reservas" className="adm-btn adm-btn--ghost">
          ← Volver a reservas
        </Link>
      </div>

      <NuevaReservaForm
        services={services.filter((s) => s.isActive)}
        locations={locations.filter((l) => l.isActive)}
        settings={settingsSeguro}
      />
    </>
  );
}
