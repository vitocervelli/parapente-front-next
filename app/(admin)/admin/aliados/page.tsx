import { redirect } from "next/navigation";
import { AlliesEditor } from "./AlliesEditor";
import { listAllies, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function AliadosPage() {
  await requireAdmin();

  let allies;
  try {
    allies = await listAllies();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Aliados</h1>
          <p className="adm-sub">
            Las marcas de la sección «Vuelan con nosotros» de la portada. Con logo se muestra la
            imagen; sin logo, el nombre en un rótulo.
          </p>
        </div>
      </div>
      <AlliesEditor allies={allies} />
    </>
  );
}
