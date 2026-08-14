import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookingWizard } from "./BookingWizard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getLocations, getServices, getSettings } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reserva tu vuelo — Parapente Bella Vista",
  description:
    "Elige día y hora, dinos quién vuela y reserva tu plaza. Confirmamos en cuanto validemos el pago.",
};

/**
 * Las plazas libres cambian con cada reserva y hay que leer la sesión, así que
 * esta página se renderiza siempre en cada petición. Sin esto, el build la
 * prerenderizaría con la disponibilidad vacía.
 */
export const dynamic = "force-dynamic";

export default async function ReservaPage() {
  // La cuenta va primero: pedir los datos de los asistentes y perderlos al
  // final porque hay que registrarse es la peor forma de hacerlo.
  const session = await getSession();
  if (!session) {
    redirect("/acceder?volver=/reserva");
  }

  const [services, locations, settings] = await Promise.all([
    getServices(),
    getLocations(),
    getSettings(),
  ]);

  return (
    <>
      <SiteNav active="/reserva" reserveHref="/reserva" />

      <header className="page-hero page-hero--compact">
        <div className="page-hero__scrim" />
        <div className="page-hero__content">
          <span className="page-hero__kicker">Reserva</span>
          <h1>Elige tu día</h1>
          <div className="page-hero__script">y vuela</div>
        </div>
      </header>

      <BookingWizard
        services={services.filter((s) => s.isActive)}
        locations={locations}
        session={{ email: session.email, fullName: session.fullName, phone: session.phone }}
        settings={settings}
      />

      <SiteFooter />
    </>
  );
}
