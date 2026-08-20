import Link from "next/link";
import { HistoricaReservaForm } from "./HistoricaReservaForm";
import { requireAdmin } from "@/lib/auth";

export default async function HistoricaReservaPage() {
  await requireAdmin();

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Reserva histórica</h1>
          <p className="adm-sub">
            Para registrar reservas anteriores al sistema. No reserva plazas ni toca el calendario:
            nace completada y suma en los contadores.
          </p>
        </div>
        <Link href="/admin/reservas" className="adm-btn adm-btn--ghost">
          ← Volver a reservas
        </Link>
      </div>

      <HistoricaReservaForm />
    </>
  );
}
