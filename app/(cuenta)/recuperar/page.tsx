import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RecuperarForm } from "./RecuperarForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Recuperar contraseña — Parapente Bella Vista",
  description: "Te enviamos un enlace para elegir una nueva contraseña.",
  robots: { index: false, follow: false },
};

export default async function RecuperarPage() {
  const session = await getSession();
  if (session) redirect(session.isAdmin ? "/admin" : "/cuenta");

  return (
    <>
      <SiteNav />

      <section className="acceso">
        <div className="acceso__inner">
          <header className="acceso__head">
            <span className="acceso__kicker">Tu cuenta</span>
            <h1 className="acceso__titulo">Recuperar contraseña</h1>
            <p className="acceso__sub">
              Escribe tu correo y te enviaremos un enlace para elegir una nueva contraseña.
            </p>
          </header>

          <div className="acceso__card">
            <RecuperarForm />
          </div>

          <p className="acceso__pie">
            <Link href="/acceder" className="acceso__link">
              Volver a entrar
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
