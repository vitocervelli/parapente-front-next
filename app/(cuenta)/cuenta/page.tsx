import Link from "next/link";
import { getMyBookings } from "@/lib/account-api";
import { formatDayLong } from "@/lib/availability";
import { requireCustomer } from "@/lib/auth";

/** Colores del estado: solo el que espera acción del cliente destaca. */
const TONO: Record<string, string> = {
  pending_payment: "res-estado--aviso",
  proof_submitted: "res-estado--espera",
  confirmed: "res-estado--ok",
};

export default async function MisReservasPage() {
  const session = await requireCustomer();
  const reservas = await getMyBookings();

  return (
    <>
      <div className="cuenta__head">
        <div>
          <h1 className="cuenta__titulo">Hola, {session.displayName}</h1>
          <p className="cuenta__sub">Aquí tienes tus vuelos y el estado de cada reserva.</p>
        </div>
        <Link href="/reserva" className="adm-btn adm-btn--primary">
          Reservar un vuelo
        </Link>
      </div>

      {reservas.length === 0 ? (
        <div className="cuenta__vacio">
          <p>Todavía no tienes ninguna reserva.</p>
          <p className="cuenta__vacio-sub">
            Cuando reserves, aparecerá aquí con su estado y podrás subir el comprobante de la
            transferencia.
          </p>
        </div>
      ) : (
        <ul className="res-lista">
          {reservas.map((r) => (
            <li key={r.reference} className="res-card">
              <header className="res-card__head">
                <div>
                  <Link href={`/cuenta/reservas/${r.reference}`} className="res-card__ref">
                    {r.reference}
                  </Link>
                  <span className="res-card__fecha">
                    Reservada el {new Date(r.createdAt).toLocaleDateString("es-ES")}
                  </span>
                </div>
                <span className={`res-estado ${TONO[r.status] ?? ""}`}>{r.statusLabel}</span>
              </header>

              <ul className="res-card__lineas">
                {r.lines.map((l) => (
                  <li key={l.id}>
                    <strong>
                      {l.serviceName}
                      {l.quantity > 1 ? ` ×${l.quantity}` : ""}
                    </strong>
                    {l.slot && (
                      <span>
                        {formatDayLong(l.slot.date)} · {l.slot.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <footer className="res-card__pie">
                <span className="res-card__total">{r.total.display}</span>
                {r.media.length > 0 && (
                  <Link href={`/cuenta/reservas/${r.reference}`} className="res-card__accion">
                    📷 {r.media.length}{" "}
                    {r.media.length === 1 ? "recuerdo de tu vuelo" : "recuerdos de tu vuelo"} →
                  </Link>
                )}
                {r.status === "pending_payment" && (
                  <Link href={`/cuenta/reservas/${r.reference}`} className="res-card__accion">
                    Subir comprobante →
                  </Link>
                )}
              </footer>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
