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
      <div className="adm-login__card">
        <h1 className="adm-login__title">Panel</h1>
        <p className="adm-login__sub">Parapente Bella Vista</p>
        <LoginForm />
      </div>
    </div>
  );
}
