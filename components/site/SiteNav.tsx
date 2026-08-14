import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ds/Button";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/site";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/galeria", label: "Fotos" },
  { href: "/contacto", label: "Contacto" },
];

type Props = {
  /** 'home' = fixed transparent-navy bar over the hero; 'page' = sticky solid bar */
  variant?: "home" | "page";
  active?: string;
  /** Contacto uses an in-page anchor for its reserve button */
  reserveHref?: string;
};

export async function SiteNav({ variant = "page", active, reserveHref = "/reserva" }: Props) {
  // Sin cookie no toca el backend, así que la visita anónima solo hace este
  // render dinámico: el enlace a la cuenta solo sale con sesión iniciada.
  const session = await getSession();
  const cuentaHref = session ? (session.isAdmin ? "/admin" : "/cuenta") : null;

  return (
    <nav className={`nav nav--${variant}`}>
      <Link href="/" className="nav__brand">
        <Image src="/assets/logo-mark.png" alt={site.name} width={1881} height={1140} priority />
        <span>{site.name}</span>
      </Link>
      <div className="nav__links">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav__link${active === l.href ? " nav__link--active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
        {cuentaHref && (
          <Link
            href={cuentaHref}
            className={`nav__link${active === cuentaHref ? " nav__link--active" : ""}`}
          >
            {session?.isAdmin ? "Panel" : "Mi cuenta"}
          </Link>
        )}
        {variant === "home" ? (
          <Link href={reserveHref} className="nav__cta">
            Reserva
          </Link>
        ) : (
          <Button size="sm" href={reserveHref}>
            Reserva
          </Button>
        )}
      </div>
    </nav>
  );
}
