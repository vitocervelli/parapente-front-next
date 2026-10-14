import { LeadsTable } from "./LeadsTable";
import { listInfluencerLeads } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function AdminEmbajadoresPage() {
  await requireAdmin();

  const leads = await listInfluencerLeads();
  const nuevas = leads.filter((l) => l.status === "new").length;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Embajadores</h1>
          <p className="adm-sub">
            {leads.length === 0
              ? "Solicitudes del formulario oculto /embajadores."
              : `${leads.length} ${leads.length === 1 ? "solicitud" : "solicitudes"}${
                  nuevas > 0 ? ` · ${nuevas} ${nuevas === 1 ? "nueva" : "nuevas"} sin revisar` : ""
                }.`}
          </p>
        </div>
        {leads.length > 0 && (
          <div className="adm-actions">
            {/* Enlace normal (no fetch): el navegador gestiona la descarga del .xlsx. */}
            <a href="/admin/embajadores/export" className="adm-btn adm-btn--primary" download>
              Descargar Excel
            </a>
          </div>
        )}
      </div>

      <LeadsTable leads={leads} />
    </>
  );
}
