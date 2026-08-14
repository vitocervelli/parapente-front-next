import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./actions";
import { AdminNav } from "./AdminNav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel — Parapente Bella Vista",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // La barra solo se pinta para administradores: la cookie es la misma que usa
  // el área de cliente, y con `isAuthenticated` a secas una clienta con sesión
  // abierta vería el armazón del panel.
  const session = await getSession();
  const isAdmin = session?.isAdmin ?? false;

  if (!isAdmin) {
    return (
      <div className="adm adm--bare">
        <main className="adm__main">{children}</main>
      </div>
    );
  }

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link href="/admin" className="adm__brand">
          <span className="adm__brand-name">Parapente Bella Vista</span>
          <span className="adm__brand-tag">Panel de administración</span>
        </Link>

        <AdminNav />

        <div className="adm__side-foot">
          <Link href="/" target="_blank" rel="noopener" className="adm__side-link">
            Ver la web ↗
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="adm__logout">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="adm__main">{children}</main>
    </div>
  );
}
