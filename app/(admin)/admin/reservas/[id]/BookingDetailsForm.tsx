"use client";

import { useState, useTransition } from "react";
import { updateBookingAction } from "../actions";
import type { AdminBooking } from "@/lib/admin-api";
import { formatDayLong } from "@/lib/availability";

type AttForm = {
  id: number;
  fullName: string;
  idNumber: string;
  email: string;
  phone: string;
  weightKg: string;
};

/** Del modelo del servidor al formulario: todo texto, para editarlo cómodo. */
function toForm(booking: AdminBooking) {
  const attendees: AttForm[] = booking.lines.flatMap((l) =>
    l.attendees.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      idNumber: a.idNumber,
      email: a.email,
      phone: a.phone ?? "",
      weightKg: a.weightKg != null ? String(a.weightKg) : "",
    })),
  );

  return {
    contactPhone: booking.contactPhone ?? "",
    customerNote: booking.customerNote ?? "",
    adminNote: booking.adminNote ?? "",
    attendees,
  };
}

/**
 * Edición de los datos de la reserva. Disponible en cualquier estado — el
 * equipo corrige un correo o un peso aunque la reserva ya esté confirmada.
 */
export function BookingDetailsForm({ booking }: { booking: AdminBooking }) {
  const inicial = toForm(booking);
  const [form, setForm] = useState(inicial);
  // La referencia con la que se compara para saber si hay cambios. Tras guardar
  // pasa a ser lo recién guardado, así el botón vuelve a desactivarse.
  const [base, setBase] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [guardando, startGuardar] = useTransition();

  const sucio = JSON.stringify(form) !== JSON.stringify(base);

  function editar(campo: "contactPhone" | "customerNote" | "adminNote", valor: string) {
    setOk(false);
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function editarAsistente(id: number, campo: keyof AttForm, valor: string) {
    setOk(false);
    setForm((f) => ({
      ...f,
      attendees: f.attendees.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)),
    }));
  }

  function guardar() {
    setError(null);
    setOk(false);

    startGuardar(async () => {
      const result = await updateBookingAction(booking.id, {
        contactPhone: form.contactPhone.trim() || null,
        customerNote: form.customerNote.trim() || null,
        adminNote: form.adminNote.trim() || null,
        attendees: form.attendees.map((a) => ({
          id: a.id,
          fullName: a.fullName,
          idNumber: a.idNumber,
          email: a.email,
          phone: a.phone.trim() || null,
          weightKg: a.weightKg,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // El guardado fue la verdad: esta versión es la nueva base.
      setBase(form);
      setOk(true);
    });
  }

  // El índice global del asistente dentro de la reserva, para el mapa por id.
  const porId = new Map(form.attendees.map((a) => [a.id, a]));

  return (
    <section className="adm-card">
      <div className="rev__edit-head">
        <h2 className="adm-card__title">Datos de la reserva</h2>
        <span className="adm-hint">Editable en cualquier estado</span>
      </div>

      <div className="rev__datos">
        <label className="adm-field">
          <span>Teléfono de contacto</span>
          <input
            type="text"
            value={form.contactPhone}
            onChange={(e) => editar("contactPhone", e.target.value)}
          />
        </label>
        <label className="adm-field">
          <span>Nota del cliente</span>
          <textarea
            rows={2}
            value={form.customerNote}
            onChange={(e) => editar("customerNote", e.target.value)}
          />
        </label>
        <label className="adm-field">
          <span>Nota interna</span>
          <textarea
            rows={2}
            value={form.adminNote}
            onChange={(e) => editar("adminNote", e.target.value)}
          />
        </label>
      </div>

      {booking.lines.map((l) => (
        <div key={l.id} className="rev__linea">
          <header>
            <strong>
              {l.serviceName}
              {l.quantity > 1 ? ` ×${l.quantity}` : ""}
            </strong>
            <span>
              {l.slot ? `${formatDayLong(l.slot.date)} · ${l.slot.label}` : "—"} · {l.seatsTotal}{" "}
              {l.seatsTotal === 1 ? "plaza" : "plazas"} · {l.lineTotal.display}
            </span>
          </header>

          <div className="rev__att-lista">
            {l.attendees.map((a, i) => {
              const f = porId.get(a.id)!;
              return (
                <div key={a.id} className="rev__att">
                  <span className="rev__att-num">Persona {i + 1}</span>
                  <div className="rev__att-campos">
                    <label className="adm-field">
                      <span>Nombre y apellidos</span>
                      <input
                        type="text"
                        value={f.fullName}
                        onChange={(e) => editarAsistente(a.id, "fullName", e.target.value)}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Cédula</span>
                      <input
                        type="text"
                        value={f.idNumber}
                        onChange={(e) => editarAsistente(a.id, "idNumber", e.target.value)}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Correo</span>
                      <input
                        type="email"
                        value={f.email}
                        onChange={(e) => editarAsistente(a.id, "email", e.target.value)}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Teléfono</span>
                      <input
                        type="text"
                        value={f.phone}
                        onChange={(e) => editarAsistente(a.id, "phone", e.target.value)}
                      />
                    </label>
                    <label className="adm-field">
                      <span>Peso (kg)</span>
                      <input
                        type="number"
                        value={f.weightKg}
                        placeholder="Opcional"
                        onChange={(e) => editarAsistente(a.id, "weightKg", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="adm-alert adm-alert--error">{error}</p>}
      {ok && !sucio && <p className="adm-alert adm-alert--ok">Cambios guardados.</p>}

      <div className="adm-actions">
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          disabled={!sucio || guardando}
          onClick={guardar}
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        {sucio && !guardando && (
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => {
              setForm(base);
              setError(null);
            }}
          >
            Descartar
          </button>
        )}
      </div>
    </section>
  );
}
