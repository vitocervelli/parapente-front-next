"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutCustomerAction } from "../acceder/actions";

/**
 * `dentro` marca las rutas que cuelgan de una opción: el detalle de una reserva
 * vive en /cuenta/reservas/… y tiene que seguir señalando «Mis reservas».
 */
const OPCIONES = [
  { href: "/cuenta", label: "Mis reservas", dentro: "/cuenta/reservas" },
  { href: "/cuenta/perfil", label: "Mis datos", dentro: null },
];

export function CuentaSidebar({ nombre, email }: { nombre: string; email: string }) {
  const ruta = usePathname();

  return (
    <aside className="cuenta-side">
      <div className="cuenta-side__quien">
        <span className="cuenta-side__nombre">{nombre}</span>
        <span className="cuenta-side__correo">{email}</span>
      </div>

      <nav className="cuenta-side__nav">
        {OPCIONES.map((o) => {
          const activa = ruta === o.href || (o.dentro !== null && ruta.startsWith(o.dentro));

          return (
            <Link
              key={o.href}
              href={o.href}
              aria-current={activa ? "page" : undefined}
              className={`cuenta-side__opcion${activa ? " cuenta-side__opcion--on" : ""}`}
            >
              {o.label}
            </Link>
          );
        })}

        <Link href="/reserva" className="cuenta-side__opcion cuenta-side__opcion--cta">
          Reservar un vuelo
        </Link>
      </nav>

      <form action={logoutCustomerAction} className="cuenta-side__salir">
        <button type="submit">Salir</button>
      </form>
    </aside>
  );
}
