"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegación del panel, agrupada por área de trabajo. Para añadir una sección
 * nueva basta con sumar una entrada aquí: el resaltado del enlace activo y el
 * responsive salen gratis.
 *
 * `match` lista los prefijos de ruta que "pertenecen" al enlace — así
 * /admin/servicios/12 sigue iluminando «Servicios».
 */
const GRUPOS: {
  titulo: string;
  items: { href: string; label: string; match: string[] }[];
}[] = [
  {
    titulo: "Catálogo",
    items: [
      { href: "/admin/servicios", label: "Servicios", match: ["/admin/servicios"] },
      { href: "/admin/localidades", label: "Localidades", match: ["/admin/localidades"] },
      { href: "/admin/extras", label: "Extras de pago", match: ["/admin/extras"] },
      { href: "/admin/inclusiones", label: "Elementos incluidos", match: ["/admin/inclusiones"] },
      { href: "/admin/aliados", label: "Aliados", match: ["/admin/aliados"] },
      { href: "/admin/galeria", label: "Galería", match: ["/admin/galeria"] },
      { href: "/admin/reels", label: "Reels", match: ["/admin/reels"] },
    ],
  },
  {
    titulo: "Operación",
    items: [
      { href: "/admin/reservas", label: "Reservas", match: ["/admin/reservas"] },
      { href: "/admin/disponibilidad", label: "Disponibilidad", match: ["/admin/disponibilidad"] },
      { href: "/admin/usuarios", label: "Clientes", match: ["/admin/usuarios"] },
    ],
  },
  {
    titulo: "Sistema",
    items: [{ href: "/admin/ajustes", label: "Ajustes", match: ["/admin/ajustes"] }],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  const activo = (item: { href: string; match: string[] }) =>
    item.match.some((m) =>
      m === "/admin" ? pathname === "/admin" : pathname === m || pathname.startsWith(`${m}/`),
    );

  return (
    <nav className="adm__nav" aria-label="Secciones del panel">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="adm__group">
          <span className="adm__group-title">{grupo.titulo}</span>
          {grupo.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo(item) ? "page" : undefined}
              className={`adm__link${activo(item) ? " adm__link--on" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
