import { redirect } from "next/navigation";
import { ItemsEditor } from "./ItemsEditor";
import { listItems, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function InclusionesPage() {
  await requireAdmin();

  let items;
  try {
    items = await listItems();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Catálogo de elementos</h1>
          <p className="adm-sub">
            Lo que puede incluir un servicio. Se dan de alta una vez y se reutilizan en todas las
            promociones; el texto se puede ajustar en cada una.
          </p>
        </div>
      </div>
      <ItemsEditor items={items} />
    </>
  );
}
