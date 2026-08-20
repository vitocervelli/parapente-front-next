import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();

  // A quien ya es administrador se le pasa al panel; a una clienta con sesión
  // abierta se le deja el formulario para que entre con su cuenta de admin.
  if (session?.isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="adm-login">
      <div className="adm-login__col">
        <div className="adm-login__brand">
          <Image
            src="/assets/logo-white-trimmed.png"
            alt="Parapente Bella Vista"
            width={1881}
            height={1140}
            priority
            className="adm-login__logo"
          />
          <span className="adm-login__nombre">Parapente Bella Vista</span>
          <span className="adm-login__panel">Panel de administración</span>
        </div>

        <div className="adm-login__card">
          <h1 className="adm-login__title">Hola de nuevo</h1>
          <p className="adm-login__sub">Entra con tu cuenta del equipo.</p>
          <LoginForm />
        </div>

        <Link href="/" className="adm-login__volver">
          ← Volver a la web
        </Link>
      </div>
    </div>
  );
}
