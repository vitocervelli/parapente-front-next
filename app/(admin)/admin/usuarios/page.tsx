import { NewAdminForm } from "./NewAdminForm";
import { UsersTable } from "./UsersTable";
import { listUsers } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function AdminUsuariosPage() {
  await requireAdmin();

  const usuarios = await listUsers();
  const clientes = usuarios.filter((u) => !u.isAdmin).length;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Clientes</h1>
          <p className="adm-sub">
            {usuarios.length === 0
              ? "Aún no hay usuarios registrados."
              : `${clientes} ${clientes === 1 ? "cliente registrado" : "clientes registrados"}.`}
          </p>
        </div>
        <div className="adm-actions">
          <NewAdminForm />
        </div>
      </div>

      <UsersTable usuarios={usuarios} />
    </>
  );
}
