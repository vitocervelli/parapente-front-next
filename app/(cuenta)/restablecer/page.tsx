import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RestablecerForm } from "./RestablecerForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nueva contraseña — Parapente Bella Vista",
  description: "Elige una nueva contraseña para tu cuenta.",
  robots: { index: false, follow: false },
};

export default async function RestablecerPage({ searchParams }: PageProps<"/restablecer">) {
  const session = await getSession();
  if (session) redirect(session.isAdmin ? "/admin" : "/cuenta");

  const { token } = await searchParams;
  const validToken = typeof token === "string" ? token : "";

  return (
    <>
      <SiteNav />

      <section className="acceso">
        <div className="acceso__inner">
          <header className="acceso__head">
            <span className="acceso__kicker">Tu cuenta</span>
            <h1 className="acceso__titulo">Nueva contraseña</h1>
            <p className="acceso__sub">Elige una contraseña nueva para tu cuenta.</p>
          </header>

          <div className="acceso__card">
            {validToken ? (
              <RestablecerForm token={validToken} />
            ) : (
              <div className="acceso__form">
                <p className="acceso__error">
                  El enlace no es válido o ha caducado. Pide uno nuevo desde «recuperar contraseña».
                </p>
                <Link href="/recuperar" className="acceso__link">
                  Pedir un enlace nuevo
                </Link>
              </div>
            )}
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
