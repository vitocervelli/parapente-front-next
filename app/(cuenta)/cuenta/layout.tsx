import type { Metadata } from "next";
import { CuentaSidebar } from "./CuentaSidebar";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Mi cuenta — Parapente Bella Vista",
  robots: { index: false, follow: false },
};

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomer();

  return (
    <>
      {/* La misma cabecera que el resto de la web: el área privada no es otro
          sitio, y con su propia barra parecía que se salía de la página. */}
      <SiteNav active="/cuenta" />

      <div className="cuenta-shell">
        <CuentaSidebar nombre={session.displayName} email={session.email} />
        <main className="cuenta__main">{children}</main>
      </div>

      <SiteFooter />
    </>
  );
}
