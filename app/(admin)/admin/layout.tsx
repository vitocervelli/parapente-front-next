import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./actions";
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

  return (
    <div className="adm">
      {isAdmin && (
        <header className="adm__bar">
          <Link href="/admin" className="adm__brand">
            Parapente Bella Vista <span>Panel</span>
          </Link>
          <nav className="adm__nav">
            <Link href="/admin">Servicios</Link>
            <Link href="/admin/reservas">Reservas</Link>
            <Link href="/admin/localidades">Localidades</Link>
            <Link href="/admin/disponibilidad">Disponibilidad</Link>
            <Link href="/admin/inclusiones">Catálogo</Link>
            <Link href="/admin/extras">Extras</Link>
            <Link href="/admin/ajustes">Ajustes</Link>
            <Link href="/" target="_blank" rel="noopener">
              Ver la web ↗
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="adm__logout">
                Salir
              </button>
            </form>
          </nav>
        </header>
      )}
      <main className="adm__main">{children}</main>
    </div>
  );
}
