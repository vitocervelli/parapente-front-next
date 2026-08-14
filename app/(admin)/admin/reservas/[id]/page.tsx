import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingReview } from "./BookingReview";
import { getBooking } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function AdminReservaDetallePage({
  params,
}: PageProps<"/admin/reservas/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    notFound();
  }

  const reserva = await getBooking(numericId);
  if (!reserva) {
    notFound();
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <Link href="/admin/reservas" className="res-volver">
            ← Reservas
          </Link>
          <h1 className="adm-title">{reserva.reference}</h1>
          <p className="adm-sub">
            {reserva.customer?.fullName ?? "—"} · {reserva.customer?.email} ·{" "}
            {reserva.contactPhone ?? "sin teléfono"}
          </p>
        </div>
        <span className="res-detalle__total">{reserva.total.display}</span>
      </div>

      <BookingReview booking={reserva} />
    </>
  );
}
