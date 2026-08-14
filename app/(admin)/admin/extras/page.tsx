import { redirect } from "next/navigation";
import { ExtrasEditor } from "./ExtrasEditor";
import { listExtras, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function ExtrasPage() {
  await requireAdmin();

  let extras;
  try {
    extras = await listExtras();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Catálogo de extras</h1>
          <p className="adm-sub">
            Extras de pago que un servicio puede ofrecer (p. ej. paseo a caballo). Se cobran por cada
            pasajero que los elige. Aquí se dan de alta; luego se asignan a cada servicio.
          </p>
        </div>
      </div>
      <ExtrasEditor extras={extras} />
    </>
  );
}
