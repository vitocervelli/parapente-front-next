import { PasswordForm } from "./PasswordForm";
import { ProfileForm } from "./ProfileForm";
import { requireCustomer } from "@/lib/auth";

export default async function PerfilPage() {
  const session = await requireCustomer();

  return (
    <>
      <div className="cuenta__head">
        <div>
          <h1 className="cuenta__titulo">Mis datos</h1>
          <p className="cuenta__sub">
            Los usamos para rellenar tus reservas y para contactarte si cambia el viento.
          </p>
        </div>
      </div>

      <ProfileForm session={session} />

      <div className="cuenta__head" style={{ marginTop: 40 }}>
        <div>
          <h2 className="cuenta__titulo">Contraseña</h2>
          <p className="cuenta__sub">Cámbiala cuando quieras; necesitas la actual para confirmarlo.</p>
        </div>
      </div>

      <PasswordForm />
    </>
  );
}
