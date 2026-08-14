import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessForms } from "./AccessForms";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Acceder — Parapente Bella Vista",
  description: "Entra en tu cuenta para reservar y ver el estado de tus vuelos.",
  robots: { index: false, follow: false },
};

export default async function AccederPage({ searchParams }: PageProps<"/acceder">) {
  const { volver } = await searchParams;
  const destino = typeof volver === "string" && volver.startsWith("/") ? volver : "/cuenta";

  const session = await getSession();
  if (session) {
    redirect(session.isAdmin ? "/admin" : destino);
  }

  const paraReservar = destino === "/reserva";

  return (
    <>
      <SiteNav />

      <section className="acceso">
        <div className="acceso__inner">
          <header className="acceso__head">
            <span className="acceso__kicker">Tu cuenta</span>
            <h1 className="acceso__titulo">
              {paraReservar ? "Antes de reservar" : "Tus reservas, en un sitio"}
            </h1>
            <p className="acceso__sub">
              {paraReservar
                ? "Necesitas una cuenta para reservar: con ella sigues el estado de tu vuelo y subes el comprobante del pago. Se crea en un minuto."
                : "Entra para ver el estado de tus vuelos y subir el comprobante de la transferencia."}
            </p>
          </header>

          <AccessForms destino={destino} startOn={paraReservar ? "register" : "login"} />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
