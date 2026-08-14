"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { crearReservaAdminAction, fetchDisponibilidadAction } from "../actions";
import { SlotPicker } from "@/app/reserva/SlotPicker";
import type { BookingSettings, Location, Service } from "@/lib/api";
import { toDateKey, type AvailabilityDay, type Slot } from "@/lib/availability";
import {
  addLine,
  attendeeErrors,
  companionInfo,
  draftTotal,
  emptyAttendees,
  EMPTY_DRAFT,
  formatMoney,
  isWeekendKey,
  lineExtrasCents,
  lineSeats,
  removeLine,
  seatsAvailable,
  type Draft,
  type DraftLine,
} from "@/lib/booking";

/**
 * Alta de una reserva desde el panel para un cliente que llama por teléfono.
 * Reutiliza el mismo motor de borrador/precios que la web (lib/booking.ts) y el
 * calendario (SlotPicker); solo cambia el envoltorio: aquí el administrador
 * escribe también los datos del cliente.
 */
export function NuevaReservaForm({
  services,
  locations,
  settings,
}: {
  services: Service[];
  locations: Location[];
  settings: BookingSettings;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  // Datos del cliente (se resuelve o crea la cuenta por su correo).
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  // Selección de vuelo.
  const [zona, setZona] = useState<string | null>(locations[0]?.slug ?? null);
  const [dias, setDias] = useState<AvailabilityDay[]>([]);
  const [cargandoDias, setCargandoDias] = useState(false);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [franja, setFranja] = useState<Slot | null>(null);

  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<string | null>(null);
  const [enviando, startEnviar] = useTransition();

  const siguienteClave = useRef(0);

  // Al elegir zona: cargar su calendario y limpiar la franja.
  useEffect(() => {
    if (!zona) {
      setDias([]);
      return;
    }
    let vivo = true;
    setCargandoDias(true);
    setFranja(null);

    const hoy = new Date();
    const hasta = new Date(hoy);
    hasta.setDate(hasta.getDate() + 60);

    fetchDisponibilidadAction(zona, toDateKey(hoy), toDateKey(hasta))
      .then((d) => {
        if (vivo) setDias(d);
      })
      .finally(() => {
        if (vivo) setCargandoDias(false);
      });

    return () => {
      vivo = false;
    };
  }, [zona]);

  const serviciosZona = zona
    ? services.filter((s) => s.locations.some((l) => l.slug === zona))
    : [];

  // Si la selección no está en la zona actual, se pasa al primero de la zona.
  useEffect(() => {
    if (serviciosZona.length === 0) {
      if (servicioId !== null) setServicioId(null);
      return;
    }
    if (!serviciosZona.some((s) => s.id === servicioId)) {
      setServicioId(serviciosZona[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- basta con reaccionar al cambio de zona
  }, [zona, services]);

  const servicio = serviciosZona.find((s) => s.id === servicioId) ?? null;
  const plazasNecesarias = servicio ? servicio.seatsPerBooking * cantidad : 1;
  const total = draftTotal(draft, settings);

  const libresEn = (slot: Slot) => seatsAvailable(draft, slot);
  const cabe = franja !== null && libresEn(franja) >= plazasNecesarias;
  const puedeAñadir = servicio !== null && franja !== null && cabe;

  function añadir() {
    if (!servicio || !franja) return;
    if (!cabe) {
      setAviso(`En esa franja quedan ${libresEn(franja)} plazas y necesitas ${plazasNecesarias}.`);
      return;
    }

    const linea: DraftLine = {
      key: `${servicio.id}-${franja.id}-${siguienteClave.current++}`,
      serviceId: servicio.id,
      serviceName: servicio.name,
      serviceSlug: servicio.slug,
      priceDisplay: servicio.price.display,
      priceAmount: servicio.price.amount,
      currency: servicio.price.currency,
      people: servicio.people,
      seatsPerBooking: servicio.seatsPerBooking,
      quantity: cantidad,
      slot: franja,
      attendees: emptyAttendees(servicio.people * cantidad),
      extras: servicio.extras.map((e) => ({
        id: e.id,
        name: e.name,
        priceAmount: e.price.amount,
        currency: e.price.currency,
        display: e.price.display,
        icon: e.icon,
      })),
      companionCount: 0,
    };

    setDraft((d) => ({ ...addLine(d, linea), locationSlug: zona }));
    setFranja(null);
    setCantidad(1);
    setAviso(null);
    setError(null);
  }

  function editarAsistente(lineKey: string, index: number, campo: string, valor: string) {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) =>
        l.key !== lineKey
          ? l
          : {
              ...l,
              attendees: l.attendees.map((a, i) => (i === index ? { ...a, [campo]: valor } : a)),
            },
      ),
    }));
  }

  function alternarExtra(lineKey: string, index: number, extraId: number) {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) =>
        l.key !== lineKey
          ? l
          : {
              ...l,
              attendees: l.attendees.map((a, i) => {
                if (i !== index) return a;
                const tiene = a.extraIds.includes(extraId);
                return {
                  ...a,
                  extraIds: tiene
                    ? a.extraIds.filter((id) => id !== extraId)
                    : [...a.extraIds, extraId],
                };
              }),
            },
      ),
    }));
  }

  function fijarAcompanantes(lineKey: string, valor: number) {
    const n = Number.isFinite(valor) ? Math.max(0, Math.min(50, Math.trunc(valor))) : 0;
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.key === lineKey ? { ...l, companionCount: n } : l)),
    }));
  }

  function crear() {
    setError(null);

    if (!email.trim()) {
      setError("Escribe el correo del cliente.");
      return;
    }
    if (draft.lines.length === 0) {
      setError("Añade al menos un vuelo a la reserva.");
      return;
    }
    // Todos los asistentes deben estar completos (mismo criterio que la web).
    for (const l of draft.lines) {
      for (let i = 0; i < l.attendees.length; i++) {
        const err = attendeeErrors(l.attendees[i]);
        if (err.fullName || err.idNumber || err.email || err.weightKg) {
          setError(`Faltan datos de una persona en "${l.serviceName}". Revisa los campos.`);
          return;
        }
      }
    }

    startEnviar(async () => {
      const result = await crearReservaAdminAction({
        customer: {
          email: email.trim(),
          fullName: nombre.trim() || null,
          phone: telefono.trim() || null,
        },
        contactPhone: telefono.trim() || null,
        note: draft.note.trim() || null,
        lines: draft.lines.map((l) => ({
          serviceId: l.serviceId,
          slotId: l.slot.id,
          quantity: l.quantity,
          companionCount: l.companionCount,
          attendees: l.attendees.map((a) => ({
            fullName: a.fullName.trim(),
            idNumber: a.idNumber.trim(),
            email: a.email.trim(),
            phone: a.phone?.trim() || undefined,
            weightKg: a.weightKg || undefined,
            extraIds: a.extraIds,
          })),
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreada(result.reference);
    });
  }

  // ── Pantalla de confirmación ────────────────────────────────────────────
  if (creada) {
    return (
      <div className="adm-card" style={{ maxWidth: 520 }}>
        <h2 className="adm-card__title">Reserva creada</h2>
        <p className="adm-sub" style={{ margin: 0 }}>
          Se creó la reserva <strong>{creada}</strong> en estado <strong>pendiente de pago</strong>.
          Cuando el cliente pague, registra el comprobante o confírmala desde su ficha.
        </p>
        <div className="adm-actions">
          <Link href="/admin/reservas" className="adm-btn adm-btn--primary">
            Ir a reservas
          </Link>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => {
              setDraft(EMPTY_DRAFT);
              setEmail("");
              setNombre("");
              setTelefono("");
              setCreada(null);
            }}
          >
            Crear otra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-form adm-form--wide">
      {error && <p className="adm-alert adm-alert--error">{error}</p>}

      {/* Cliente */}
      <section className="adm-card">
        <h2 className="adm-card__title">Cliente</h2>
        <p className="adm-hint">
          Se busca la cuenta por el correo; si no existe, se crea una ficha de cliente.
        </p>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Correo *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@cliente.com"
            />
          </label>
          <label className="adm-field">
            <span>Nombre y apellidos</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Teléfono</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Vuelos */}
      <section className="adm-card">
        <h2 className="adm-card__title">Vuelos</h2>

        <div className="adm-field">
          <span>Localidad</span>
          <div className="wiz__zonas" role="group" aria-label="Localidad">
            {locations.map((l) => {
              const bloqueada = draft.lines.length > 0 && draft.locationSlug !== l.slug;
              return (
                <button
                  key={l.slug}
                  type="button"
                  disabled={bloqueada}
                  onClick={() => {
                    setZona(l.slug);
                    setServicioId(null);
                    setAviso(null);
                  }}
                  title={bloqueada ? "La reserva ya tiene vuelos de otra zona." : undefined}
                  className={`wiz__zona${zona === l.slug ? " wiz__zona--sel" : ""}`}
                >
                  <span className="wiz__zona-nombre">{l.name}</span>
                  {l.region && <span className="wiz__zona-region">{l.region}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="adm-grid">
          <label className="adm-field">
            <span>Servicio</span>
            <select
              value={servicioId ?? ""}
              onChange={(e) => setServicioId(Number(e.target.value) || null)}
              disabled={serviciosZona.length === 0}
            >
              {serviciosZona.length === 0 && <option>Sin servicios en esta zona</option>}
              {serviciosZona.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.price.display}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>Unidades</span>
            <input
              type="number"
              min={1}
              max={10}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            />
          </label>
        </div>

        {cargandoDias ? (
          <p className="adm-hint">Cargando disponibilidad…</p>
        ) : !zona ? (
          <p className="adm-hint">Elige una localidad.</p>
        ) : dias.length === 0 ? (
          <p className="adm-hint">Esta localidad no tiene horarios abiertos ahora mismo.</p>
        ) : (
          <SlotPicker
            days={dias}
            seatsNeeded={plazasNecesarias}
            selectedSlotId={franja?.id ?? null}
            onSelect={(s) => {
              setFranja(s);
              setAviso(null);
            }}
            libresEn={libresEn}
          />
        )}

        {aviso && <p className="adm-hint adm-hint--error">{aviso}</p>}

        <div className="adm-actions">
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            disabled={!puedeAñadir}
            onClick={añadir}
          >
            {franja ? `Añadir · ${franja.label}` : "Elige una hora"}
          </button>
        </div>
      </section>

      {/* Personas por línea */}
      {draft.lines.map((linea) => (
        <section key={linea.key} className="adm-card">
          <div className="adm-card__head">
            <h2 className="adm-card__title">
              {linea.serviceName}
              {linea.quantity > 1 ? ` ×${linea.quantity}` : ""}
            </h2>
            <button
              type="button"
              className="adm-btn adm-btn--danger"
              onClick={() => setDraft((d) => removeLine(d, linea.key))}
            >
              Quitar
            </button>
          </div>
          <p className="adm-hint">
            {new Date(linea.slot.date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}{" "}
            · {linea.slot.label} · {lineSeats(linea)} {lineSeats(linea) === 1 ? "plaza" : "plazas"}
          </p>

          {linea.attendees.map((a, i) => {
            const fallos = attendeeErrors(a);
            return (
              <div key={i} className="adm-att">
                <span className="adm-att__num">Persona {i + 1}</span>
                <div className="adm-grid">
                  <label className="adm-field">
                    <span>Nombre y apellidos</span>
                    <input
                      value={a.fullName}
                      onChange={(e) => editarAsistente(linea.key, i, "fullName", e.target.value)}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Cédula</span>
                    <input
                      value={a.idNumber}
                      placeholder="V-12345678"
                      onChange={(e) => editarAsistente(linea.key, i, "idNumber", e.target.value)}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Correo</span>
                    <input
                      type="email"
                      value={a.email}
                      onChange={(e) => editarAsistente(linea.key, i, "email", e.target.value)}
                    />
                  </label>
                  <label className="adm-field">
                    <span>Peso (kg)</span>
                    <input
                      type="number"
                      value={a.weightKg ?? ""}
                      placeholder="Opcional"
                      onChange={(e) => editarAsistente(linea.key, i, "weightKg", e.target.value)}
                    />
                    {fallos.weightKg && <span className="adm-hint adm-hint--error">{fallos.weightKg}</span>}
                  </label>
                </div>

                {linea.extras.length > 0 && (
                  <div className="adm-att__extras">
                    {linea.extras.map((extra) => (
                      <label key={extra.id} className="adm-att__extra">
                        <input
                          type="checkbox"
                          checked={a.extraIds.includes(extra.id)}
                          onChange={() => alternarExtra(linea.key, i, extra.id)}
                        />
                        {extra.name} <strong>+{extra.display}</strong>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <label className="adm-field" style={{ maxWidth: 260 }}>
            <span>Acompañantes (no vuelan)</span>
            <input
              type="number"
              min={0}
              value={linea.companionCount || ""}
              placeholder="0"
              onChange={(e) => fijarAcompanantes(linea.key, Number(e.target.value))}
            />
            <span className="adm-hint">
              {isWeekendKey(linea.slot.date)
                ? `Fin de semana: ${settings.companionFee.display} por acompañante.`
                : `Entre semana: ${settings.weekdayFreePerFlyer} gratis por pasajero, después ${settings.companionFee.display} c/u.`}
            </span>
          </label>
        </section>
      ))}

      {/* Nota + total + crear */}
      <section className="adm-card">
        <label className="adm-field">
          <span>Nota interna (opcional)</span>
          <textarea
            rows={2}
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            placeholder="Algo que debamos saber de esta reserva…"
          />
        </label>

        {draft.lines.length > 0 && (
          <div className="adm-resumen">
            <ul>
              {draft.lines.map((l) => (
                <li key={l.key}>
                  <span>
                    {l.serviceName} · {lineSeats(l)} {lineSeats(l) === 1 ? "plaza" : "plazas"}
                    {lineExtrasCents(l) > 0 && ` · extras +${formatMoney(lineExtrasCents(l), l.currency)}`}
                    {companionInfo(l, settings).count > 0 &&
                      ` · ${companionInfo(l, settings).count} acomp.${
                        companionInfo(l, settings).cents > 0
                          ? ` +${formatMoney(companionInfo(l, settings).cents, l.currency)}`
                          : " (gratis)"
                      }`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="adm-resumen__total">
              <span>Total</span>
              <strong>{total?.display ?? "—"}</strong>
            </div>
          </div>
        )}

        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn--primary" disabled={enviando} onClick={crear}>
            {enviando ? "Creando…" : "Crear reserva"}
          </button>
          <Link href="/admin/reservas" className="adm-btn adm-btn--ghost">
            Cancelar
          </Link>
        </div>
      </section>
    </div>
  );
}
