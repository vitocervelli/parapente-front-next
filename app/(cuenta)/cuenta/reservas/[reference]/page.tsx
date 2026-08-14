import Link from "next/link";
import { notFound } from "next/navigation";
import { ProofPanel } from "./ProofPanel";
import { getMyBooking } from "@/lib/account-api";
import { formatDayLong } from "@/lib/availability";
import { requireCustomer } from "@/lib/auth";

export default async function DetalleReservaPage({
  params,
}: PageProps<"/cuenta/reservas/[reference]">) {
  await requireCustomer();

  const { reference } = await params;
  const reserva = await getMyBooking(reference);

  if (!reserva) {
    notFound();
  }

  const caduca = reserva.expiresAt ? new Date(reserva.expiresAt) : null;

  return (
    <>
      <div className="cuenta__head">
        <div>
          <Link href="/cuenta" className="res-volver">
            ← Mis reservas
          </Link>
          <h1 className="cuenta__titulo">{reserva.reference}</h1>
          <p className="cuenta__sub">{reserva.statusLabel}</p>
        </div>
        <span className="res-detalle__total">{reserva.total.display}</span>
      </div>

      {reserva.status === "pending_payment" && caduca && (
        <div className="res-pago">
          <h2>Falta el pago</h2>
          <p>
            Tus plazas están apartadas hasta el{" "}
            <strong>
              {caduca.toLocaleDateString("es-ES")} a las{" "}
              {caduca.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </strong>
            . Sube el comprobante antes de esa hora para no perderlas.
          </p>
        </div>
      )}

      {reserva.status === "proof_submitted" && (
        <div className="res-pago res-pago--espera">
          <h2>Comprobante en revisión</h2>
          <p>
            Lo estamos comprobando. En cuanto lo validemos, tu reserva quedará confirmada — tus
            plazas siguen apartadas mientras tanto.
          </p>
        </div>
      )}

      <ProofPanel booking={reserva} />

      <section className="res-detalle">
        <h2 className="res-detalle__titulo">Tus vuelos</h2>

        {reserva.lines.map((linea) => (
          <article key={linea.id} className="res-linea">
            <header>
              <strong>
                {linea.serviceName}
                {linea.quantity > 1 ? ` ×${linea.quantity}` : ""}
              </strong>
              <span>{linea.lineTotal.display}</span>
            </header>

            {linea.slot && (
              <p className="res-linea__cuando">
                {formatDayLong(linea.slot.date)} · {linea.slot.label} · {linea.seatsTotal}{" "}
                {linea.seatsTotal === 1 ? "plaza" : "plazas"}
              </p>
            )}

            <table className="res-tabla">
              <thead>
                <tr>
                  <th>Quién vuela</th>
                  <th>Cédula</th>
                  <th>Correo</th>
                  <th>Peso</th>
                </tr>
              </thead>
              <tbody>
                {linea.attendees.map((a) => (
                  <tr key={a.id}>
                    <td>{a.fullName}</td>
                    <td>{a.idNumber}</td>
                    <td>{a.email}</td>
                    <td>{a.weightKg ? `${a.weightKg} kg` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}

        {reserva.customerNote && (
          <p className="res-nota">
            <strong>Tu nota:</strong> {reserva.customerNote}
          </p>
        )}
      </section>
    </>
  );
}
