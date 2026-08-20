"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  acceptProofAction,
  rejectProofAction,
  transitionBookingAction,
  updateProofAction,
} from "../actions";
import { BookingDetailsForm } from "./BookingDetailsForm";
import { GalleryManager } from "./GalleryManager";
import { ProofUploader } from "./ProofUploader";
import type { Proof } from "@/lib/account-api";
import type { AdminBooking } from "@/lib/admin-api";

const TONO: Record<string, string> = {
  pending: "res-estado--espera",
  accepted: "res-estado--ok",
  rejected: "res-estado--no",
};

/**
 * Revisión de UN comprobante. Si está pendiente, se acepta (con importe) o se
 * rechaza. Si ya está revisado, se pueden ajustar importe, referencia y nota —
 * para corregir un dato mal tecleado sin cambiar la decisión.
 */
function ProofReview({
  proof,
  bookingId,
  sugerido,
  ocupado,
  onRun,
}: {
  proof: Proof;
  bookingId: number;
  sugerido: string;
  ocupado: boolean;
  onRun: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => void;
}) {
  const revisado = proof.status !== "pending";
  const [abierto, setAbierto] = useState(!revisado);
  const [amount, setAmount] = useState(proof.declaredAmount ?? "");
  const [reference, setReference] = useState(proof.transferReference ?? "");
  const [note, setNote] = useState(proof.reviewNote ?? "");

  // Un comprobante ya revisado arranca plegado: el ajuste es la excepción.
  if (revisado && !abierto) {
    return (
      <button type="button" className="rev__ajustar" onClick={() => setAbierto(true)}>
        Ajustar datos del pago
      </button>
    );
  }

  return (
    <div className="rev__decision">
      <div className="rev__campos">
        <label>
          <span>Importe recibido</span>
          <input
            value={amount}
            placeholder={sugerido}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          <span>Nº de referencia</span>
          <input
            value={reference}
            placeholder="Opcional"
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
      </div>

      <textarea
        className="rev__nota"
        rows={2}
        placeholder={
          revisado
            ? "Nota del pago (opcional)"
            : "Nota (obligatoria si rechazas — el cliente la verá)"
        }
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="adm-actions">
        {revisado ? (
          <>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={ocupado}
              onClick={() =>
                onRun(() => updateProofAction(bookingId, proof.id, { amount, reference, note }))
              }
            >
              {ocupado ? "Guardando…" : "Guardar cambios del pago"}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={ocupado}
              onClick={() => setAbierto(false)}
            >
              Cerrar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={ocupado}
              onClick={() =>
                onRun(() => acceptProofAction(bookingId, proof.id, { amount, reference, note }))
              }
            >
              {ocupado ? "Aplicando…" : "Registrar pago"}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--danger"
              disabled={ocupado}
              onClick={() => onRun(() => rejectProofAction(bookingId, proof.id, note))}
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function BookingReview({ booking }: { booking: AdminBooking }) {
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();
  const router = useRouter();

  function ejecutar(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNota("");
      // Los importes cobrado/pendiente y el estado se derivan en el servidor:
      // sin esto seguirían mostrando lo de antes hasta recargar a mano.
      router.refresh();
    });
  }

  const esViva = booking.status === "pending_payment" || booking.status === "proof_submitted";
  const hayPagos = Number(booking.paid.amount) > 0;

  return (
    <div className="rev">
      {error && <p className="adm-alert adm-alert--error">{error}</p>}

      {/* ── Estado del cobro ─────────────────────────────────────────────── */}
      <section className="adm-card">
        <h2 className="adm-card__title">Cobro</h2>
        <div className="rev__cobro">
          <span>
            Total <strong>{booking.total.display}</strong>
          </span>
          <span>
            Cobrado <strong className="rev__cobrado">{booking.paid.display}</strong>
          </span>
          <span>
            Pendiente{" "}
            <strong className={booking.isFullyPaid ? "rev__cobrado" : "rev__falta"}>
              {booking.outstanding.display}
            </strong>
          </span>
          {booking.isFullyPaid && esViva && (
            <span className="res-estado res-estado--ok">Cubierto — se puede confirmar</span>
          )}
        </div>
      </section>

      {/* ── Comprobantes ─────────────────────────────────────────────────── */}
      <section className="adm-card">
        <h2 className="adm-card__title">Comprobantes</h2>

        {booking.proofs.length === 0 ? (
          <p className="adm-empty">
            El cliente todavía no ha subido ningún comprobante. Puedes añadir tú uno que te haya
            hecho llegar por otra vía.
          </p>
        ) : (
          <ul className="rev__proofs">
            {booking.proofs.map((p) => (
              <li key={p.id} className="rev__proof">
                <a
                  href={`/admin/reservas/${booking.id}/comprobante/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rev__mini"
                  title="Abrir a tamaño completo"
                >
                  {p.mimeType === "application/pdf" ? (
                    <span className="proofs__pdf">PDF</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- viene por el proxy autenticado
                    <img src={`/admin/reservas/${booking.id}/comprobante/${p.id}`} alt="" />
                  )}
                </a>

                <div className="rev__proof-info">
                  <span className={`res-estado ${TONO[p.status]}`}>{p.statusLabel}</span>
                  <span className="proofs__meta">
                    Subido el {new Date(p.uploadedAt).toLocaleString("es-ES")}
                  </span>
                  {p.declaredAmount && (
                    <span className="proofs__importe">
                      Registrado: {p.declaredAmount}
                      {p.transferReference ? ` · ref. ${p.transferReference}` : ""}
                    </span>
                  )}
                  {p.reviewNote && <span className="proofs__motivo">Nota: {p.reviewNote}</span>}

                  <ProofReview
                    proof={p}
                    bookingId={booking.id}
                    sugerido={booking.outstanding.amount}
                    ocupado={ocupado}
                    onRun={ejecutar}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rev__subir">
          <ProofUploader bookingId={booking.id} />
        </div>
      </section>

      {/* ── Fotos y vídeos del vuelo, para el cliente ────────────────────── */}
      <GalleryManager booking={booking} />

      {/* ── Vuelos, asistentes y notas (editable) ────────────────────────── */}
      <BookingDetailsForm booking={booking} />

      {/* ── Decisión sobre la reserva ────────────────────────────────────── */}
      <section className="adm-card">
        <h2 className="adm-card__title">Acciones</h2>

        {esViva && (
          <textarea
            className="rev__nota"
            rows={2}
            placeholder="Nota interna para estas acciones (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        )}

        <div className="adm-actions">
          {esViva && (
            <>
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={ocupado}
                onClick={() => ejecutar(() => transitionBookingAction(booking.id, "confirm", nota))}
                title={
                  booking.isFullyPaid
                    ? "El cobro está cubierto"
                    : `Faltan ${booking.outstanding.display} por cobrar`
                }
              >
                Confirmar reserva
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--danger"
                disabled={ocupado}
                onClick={() => ejecutar(() => transitionBookingAction(booking.id, "reject", nota))}
              >
                Rechazar reserva (libera plazas)
              </button>
            </>
          )}

          {booking.status === "confirmed" && (
            <>
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={ocupado}
                onClick={() => ejecutar(() => transitionBookingAction(booking.id, "complete", null))}
              >
                Marcar completada
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={ocupado}
                onClick={() => ejecutar(() => transitionBookingAction(booking.id, "no-show", null))}
              >
                No se presentó
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--danger"
                disabled={ocupado}
                onClick={() => ejecutar(() => transitionBookingAction(booking.id, "cancel", nota))}
              >
                Cancelar (libera plazas)
              </button>
            </>
          )}

          {!esViva && booking.status !== "confirmed" && (
            <p className="adm-hint">Esta reserva está en un estado final: no admite más cambios.</p>
          )}
        </div>

        {esViva && !booking.isFullyPaid && hayPagos && (
          <p className="adm-hint">
            Aún faltan {booking.outstanding.display}. Puedes confirmar igualmente si lo das por
            bueno.
          </p>
        )}
      </section>
    </div>
  );
}
