"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createBookingAction, fetchAvailabilityAction } from "./actions";
import { SlotPicker } from "./SlotPicker";
import { Button } from "@/components/ds/Button";
import { InclusionIcon } from "@/components/ds/InclusionIcon";
import { Input } from "@/components/ds/Input";
import { mediaUrl, type BookingSettings, type Location, type Service } from "@/lib/api";
import { formatDayLong, toDateKey, type AvailabilityDay, type Slot } from "@/lib/availability";
import {
  addLine,
  attendeeErrors,
  clearDraft,
  companionInfo,
  draftCurrency,
  draftSeats,
  draftTotal,
  emptyAttendees,
  EMPTY_DRAFT,
  firstStepWithProblems,
  formatMoney,
  isWeekendKey,
  lineExtrasCents,
  lineSeats,
  loadDraft,
  removeLine,
  saveDraft,
  seatsAvailable,
  setLineQuantity,
  stepProblems,
  type Draft,
  type DraftLine,
} from "@/lib/booking";

type Session = { email: string; fullName: string | null; phone: string | null };

const PASOS = ["Qué y cuándo", "Quién vuela", "Confirmar"] as const;

export function BookingWizard({
  services,
  locations,
  session,
  settings,
}: {
  services: Service[];
  locations: Location[];
  session: Session;
  settings: BookingSettings;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [paso, setPaso] = useState(0);
  // Zona elegida. Si el borrador ya tiene una (guardada), manda esa.
  const [zona, setZona] = useState<string | null>(locations[0]?.slug ?? null);
  const [dias, setDias] = useState<AvailabilityDay[]>([]);
  const [cargandoDias, setCargandoDias] = useState(false);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [franja, setFranja] = useState<Slot | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reserva, setReserva] = useState<string | null>(null);
  const [enviando, startEnviar] = useTransition();

  /**
   * Cuántas veces se ha intentado avanzar desde este paso. Mientras es 0 no se
   * pintan errores: nadie quiere ver el formulario en rojo antes de escribir
   * nada. Al subir, además, se lleva el foco al primer campo que falla.
   */
  const [intentos, setIntentos] = useState(0);
  const mostrarErrores = intentos > 0;

  /** Contador para las claves de las líneas: determinista, a diferencia de Date.now(). */
  const siguienteClave = useRef(0);

  useEffect(() => {
    const guardado = loadDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única del almacenamiento del navegador tras hidratar
    setDraft({ ...guardado, contactPhone: guardado.contactPhone || session.phone || "" });
    // Si el borrador ya tiene zona (recarga a mitad), se respeta.
    if (guardado.locationSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaura la zona guardada tras hidratar
      setZona(guardado.locationSlug);
    }
  }, [session.phone]);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  // Al elegir zona, se carga su calendario (60 días) y se limpia la franja.
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

    fetchAvailabilityAction(zona, toDateKey(hoy), toDateKey(hasta))
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

  useEffect(() => {
    if (intentos === 0) return;

    const primero = document.querySelector<HTMLElement>(
      ".wiz__cuerpo .pbv-field--error .pbv-field__input",
    );
    primero?.focus();
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intentos]);

  // Servicios ofrecidos en la zona elegida.
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
  const monedaActual = draftCurrency(draft);

  /**
   * Qué se le enseña al usuario ahora mismo: los fallos del paso en el que
   * está —solo si ya ha intentado avanzar— o, si lo pendiente quedó atrás, los
   * de ese paso junto al botón para volver a él.
   */
  const pendiente = firstStepWithProblems(draft);
  // Lo que falte en un paso posterior aún no se avisa: se llega a su momento.
  const pasoPendiente = pendiente !== null && pendiente <= paso ? pendiente : null;
  const problemasVisibles =
    pasoPendiente === null || (pasoPendiente === paso && !mostrarErrores)
      ? []
      : stepProblems(draft, pasoPendiente);

  /** Plazas que quedan de verdad: las del servidor menos las ya apartadas aquí. */
  const libresEn = useCallback((slot: Slot) => seatsAvailable(draft, slot), [draft]);

  const monedaIncompatible =
    servicio !== null && monedaActual !== null && servicio.price.currency !== monedaActual;

  const cabe = franja !== null && libresEn(franja) >= plazasNecesarias;
  const puedeAñadir = servicio !== null && franja !== null && cabe && !monedaIncompatible;

  function añadir() {
    if (!servicio || !franja) return;

    if (monedaIncompatible) {
      setAviso(
        `Ya tienes servicios en ${monedaActual === "EUR" ? "euros" : "dólares"}. No se pueden mezclar monedas en una misma reserva.`,
      );
      return;
    }

    if (!cabe) {
      setAviso(`En esa franja solo quedan ${libresEn(franja)} plazas y necesitas ${plazasNecesarias}.`);
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

    // La zona queda fijada en el borrador con la primera línea.
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

  /** Marca o desmarca un extra para un asistente concreto. */
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

  /** Fija cuántos acompañantes (que no vuelan) lleva una línea. */
  function fijarAcompanantes(lineKey: string, valor: number) {
    const n = Number.isFinite(valor) ? Math.max(0, Math.min(50, Math.trunc(valor))) : 0;
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.key === lineKey ? { ...l, companionCount: n } : l)),
    }));
  }

  /** Copia los datos de la cuenta en el primer asistente que esté vacío. */
  function rellenarConMisDatos(lineKey: string) {
    setDraft((d) => ({
      ...d,
      lines: d.lines.map((l) =>
        l.key !== lineKey
          ? l
          : {
              ...l,
              attendees: l.attendees.map((a, i) =>
                i === 0
                  ? {
                      ...a,
                      fullName: a.fullName || session.fullName || "",
                      email: a.email || session.email,
                      phone: a.phone || session.phone || "",
                    }
                  : a,
              ),
            },
      ),
    }));
  }

  /**
   * Único camino para cambiar de paso.
   *
   * Hacia atrás nunca se comprueba nada: volver a corregir tiene que ser
   * siempre posible. Hacia delante se validan los pasos que se dejan atrás, y
   * si alguno falla se para ahí en vez de arrastrar el fallo hasta el final.
   */
  function irAPaso(destino: number) {
    setError(null);
    setAviso(null);

    if (destino <= paso) {
      setIntentos(0);
      setPaso(Math.max(0, destino));
      return;
    }

    for (let i = paso; i < destino; i++) {
      if (stepProblems(draft, i).length > 0) {
        setPaso(i);
        setIntentos((n) => n + 1);
        return;
      }
    }

    setIntentos(0);
    setPaso(destino);
  }

  function enviar() {
    // Cinturón y tirantes: si algo falta, se vuelve al paso que lo pide en vez
    // de dejar el botón muerto sin decir dónde está el problema.
    const pendiente = firstStepWithProblems(draft);
    if (pendiente !== null) {
      setPaso(pendiente);
      setIntentos((n) => n + 1);
      return;
    }

    setError(null);

    startEnviar(async () => {
      const result = await createBookingAction({
        contactPhone: draft.contactPhone || session.phone || "",
        note: draft.note,
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

      clearDraft();
      setReserva(result.reference);
    });
  }

  // ── Pantalla de confirmación ────────────────────────────────────────────
  if (reserva) {
    return (
      <section className="wiz wiz--fin">
        <div className="wiz__ok">
          <span className="wiz__ok-icono">✓</span>
          <h2 className="wiz__ok-titulo">Reserva {reserva}</h2>
          <p className="wiz__ok-texto">
            Tus plazas están apartadas. Para confirmarlas, haz la transferencia y sube el
            comprobante desde tu cuenta — tienes 48 horas.
          </p>
          <div className="wiz__ok-acciones">
            <Button href="/cuenta" size="md">
              Ir a mis reservas
            </Button>
            <Link href="/servicios" className="wiz__enlace">
              Ver más experiencias
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="wiz">
      <ol className="wiz__pasos">
        {PASOS.map((nombre, i) => {
          const pendiente = i < paso && stepProblems(draft, i).length > 0;

          return (
            <li key={nombre}>
              <button
                type="button"
                onClick={() => irAPaso(i)}
                aria-current={i === paso ? "step" : undefined}
                title={pendiente ? "Faltan datos en este paso" : `Ir a «${nombre}»`}
                className={`wiz__paso${i === paso ? " wiz__paso--on" : ""}${i < paso ? " wiz__paso--hecho" : ""}${pendiente ? " wiz__paso--pendiente" : ""}`}
              >
                <span className="wiz__num">{i + 1}</span>
                {nombre}
                {pendiente && <span className="wiz__paso-alerta">!</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="wiz__avisos">
        {error && <p className="wiz__error">{error}</p>}

        {problemasVisibles.length > 0 && (
          <div className="wiz__problemas">
            <p className="wiz__problemas-titulo">
              {pasoPendiente === paso
                ? "Falta algo antes de continuar:"
                : `Falta algo en el paso «${PASOS[pasoPendiente!]}»:`}
            </p>
            <ul>
              {problemasVisibles.slice(0, 6).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {problemasVisibles.length > 6 && <li>…y {problemasVisibles.length - 6} más.</li>}
            </ul>

            {pasoPendiente !== null && pasoPendiente !== paso && (
              <button
                type="button"
                className="wiz__problemas-ir"
                onClick={() => irAPaso(pasoPendiente)}
              >
                ← Volver a «{PASOS[pasoPendiente]}» y corregirlo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Paso 1: qué y cuándo ─────────────────────────────────────────── */}
      {paso === 0 && (
        <div className="wiz__cuerpo">
          <div className="wiz__col">
            <h2 className="wiz__titulo">
              <span className="wiz__paso-num">1</span> Elige la localidad
            </h2>

            {locations.length === 0 ? (
              <p className="wiz__aviso-inline">
                No hay localidades disponibles ahora mismo. Vuelve a intentarlo en un momento.
              </p>
            ) : (
              <div className="wiz__zonas" role="group" aria-label="Localidad">
                {locations.map((l) => {
                  // Con líneas en el carrito la zona queda fijada: una reserva, una zona.
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
                      title={
                        bloqueada
                          ? "Ya tienes vuelos de otra zona en la reserva. Quítalos para cambiar de localidad."
                          : undefined
                      }
                      className={`wiz__zona${zona === l.slug ? " wiz__zona--sel" : ""}`}
                    >
                      <span className="wiz__zona-nombre">{l.name}</span>
                      {l.region && <span className="wiz__zona-region">{l.region}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <h2 className="wiz__titulo wiz__titulo--sep">
              <span className="wiz__paso-num">2</span> Elige la experiencia
            </h2>

            {zona && serviciosZona.length === 0 ? (
              <p className="wiz__aviso-inline">Esta localidad todavía no tiene servicios publicados.</p>
            ) : (
            <ul className="wiz__servicios">
              {serviciosZona.map((s) => {
                const bloqueado = monedaActual !== null && s.price.currency !== monedaActual;

                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() => {
                        setServicioId(s.id);
                        setAviso(null);
                      }}
                      title={
                        bloqueado
                          ? "No se puede mezclar con las monedas que ya llevas en la reserva"
                          : undefined
                      }
                      className={`wiz__servicio${servicioId === s.id ? " wiz__servicio--sel" : ""}`}
                    >
                      {s.image && (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura decorativa
                        <img src={mediaUrl(s.image)!} alt="" className="wiz__miniatura" />
                      )}
                      <span className="wiz__servicio-texto">
                        <span className="wiz__servicio-nombre">{s.name}</span>
                        <span className="wiz__servicio-meta">
                          {s.people === 1 ? "1 persona" : `${s.people} personas`} · ocupa{" "}
                          {s.seatsPerBooking} {s.seatsPerBooking === 1 ? "plaza" : "plazas"}
                        </span>
                      </span>
                      <span className="wiz__servicio-precio">{s.price.display}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}

            {servicio && servicio.inclusions.length > 0 && (
              <div className="wiz__incluye">
                <span className="wiz__incluye-titulo">{servicio.name} incluye</span>
                <ul>
                  {servicio.inclusions.map((i) => (
                    <li key={i.id}>
                      <InclusionIcon name={i.icon} path={i.iconPath} />
                      {i.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="wiz__col">
            <h2 className="wiz__titulo">
              <span className="wiz__paso-num">3</span> Elige día y hora
            </h2>

            {cargandoDias ? (
              <p className="wiz__aviso-inline">Cargando disponibilidad…</p>
            ) : !zona ? (
              <p className="wiz__aviso-inline">Elige primero una localidad.</p>
            ) : dias.length === 0 ? (
              <p className="wiz__aviso-inline">
                Esta localidad no tiene horarios abiertos ahora mismo.
              </p>
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

            {/* Añadir es una acción aparte de seleccionar: antes cada clic en una
                franja metía una línea, y era facilísimo acumularlas sin querer. */}
            <div className="wiz__añadir">
              <label className="wiz__cantidad">
                <span>Unidades</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={cantidad}
                  onChange={(e) => {
                    setCantidad(Math.max(1, Math.min(10, Number(e.target.value) || 1)));
                    setAviso(null);
                  }}
                />
                <span className="wiz__ayuda">
                  {plazasNecesarias} {plazasNecesarias === 1 ? "plaza" : "plazas"}
                </span>
              </label>

              <Button size="md" disabled={!puedeAñadir} onClick={añadir}>
                {franja
                  ? `Añadir · ${franja.label}`
                  : "Elige una hora"}
              </Button>
            </div>

            {aviso && <p className="wiz__aviso-inline">{aviso}</p>}

            {monedaIncompatible && (
              <p className="wiz__aviso-inline">
                Tu reserva está en {monedaActual === "EUR" ? "euros" : "dólares"} y este servicio
                no. Termina esta reserva y haz otra, o quita lo que llevas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Paso 2: asistentes ───────────────────────────────────────────── */}
      {paso === 1 && (
        <div className="wiz__cuerpo wiz__cuerpo--simple">
          <h2 className="wiz__titulo">¿Quién vuela?</h2>
          <p className="wiz__ayuda">
            Necesitamos el nombre, la cédula y el correo de cada persona. El peso es opcional pero
            nos ayuda a preparar el equipo.
          </p>

          {draft.lines.length === 0 && (
            <p className="wiz__resumen-vacio">
              Todavía no has añadido ningún vuelo. Vuelve al paso 1 para elegirlo.
            </p>
          )}

          {draft.lines.map((linea) => (
            <fieldset key={linea.key} className="wiz__grupo">
              <legend>
                {linea.serviceName}
                {linea.quantity > 1 ? ` ×${linea.quantity}` : ""} · {formatDayLong(linea.slot.date)}{" "}
                {linea.slot.label}
              </legend>

              <button
                type="button"
                className="wiz__rellenar"
                onClick={() => rellenarConMisDatos(linea.key)}
              >
                Usar mis datos para la primera persona
              </button>

              {linea.attendees.map((a, i) => {
                const fallos = attendeeErrors(a);
                // El peso se avisa según se escribe; el resto, solo cuando ya
                // se ha intentado continuar.
                const visible = (campo: keyof typeof fallos) =>
                  mostrarErrores ? fallos[campo] : undefined;

                return (
                  <div key={i} className="wiz__asistente">
                    <span className="wiz__asistente-num">Persona {i + 1}</span>
                    <div className="wiz__asistente-campos">
                      <Input
                        label="Nombre y apellidos"
                        value={a.fullName}
                        error={visible("fullName")}
                        onChange={(e) => editarAsistente(linea.key, i, "fullName", e.target.value)}
                      />
                      <Input
                        label="Cédula"
                        value={a.idNumber}
                        placeholder="V-12345678"
                        error={visible("idNumber")}
                        onChange={(e) => editarAsistente(linea.key, i, "idNumber", e.target.value)}
                      />
                      <Input
                        label="Correo"
                        type="email"
                        value={a.email}
                        error={visible("email")}
                        onChange={(e) => editarAsistente(linea.key, i, "email", e.target.value)}
                      />
                      <Input
                        label="Peso (kg)"
                        type="number"
                        value={a.weightKg ?? ""}
                        placeholder="Opcional"
                        error={fallos.weightKg}
                        onChange={(e) => editarAsistente(linea.key, i, "weightKg", e.target.value)}
                      />
                    </div>

                    {linea.extras.length > 0 && (
                      <div className="wiz__extras">
                        <span className="wiz__extras-titulo">Extras (opcional)</span>
                        <div className="wiz__extras-lista">
                          {linea.extras.map((extra) => (
                            <label key={extra.id} className="wiz__extra">
                              <input
                                type="checkbox"
                                checked={a.extraIds.includes(extra.id)}
                                onChange={() => alternarExtra(linea.key, i, extra.id)}
                              />
                              <span className="wiz__extra-nombre">{extra.name}</span>
                              <span className="wiz__extra-precio">+{extra.display}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="wiz__acompanantes">
                <label htmlFor={`acomp-${linea.key}`}>Acompañantes (no vuelan)</label>
                <input
                  id={`acomp-${linea.key}`}
                  type="number"
                  min={0}
                  className="wiz__acompanantes-input"
                  value={linea.companionCount || ""}
                  placeholder="0"
                  onChange={(e) => fijarAcompanantes(linea.key, Number(e.target.value))}
                />
                <span className="wiz__acompanantes-nota">
                  {isWeekendKey(linea.slot.date)
                    ? `Fin de semana: ${settings.companionFee.display} por acompañante.`
                    : `Entre semana: ${settings.weekdayFreePerFlyer} gratis por pasajero, después ${settings.companionFee.display} c/u.`}
                </span>
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {/* ── Paso 3: confirmar ────────────────────────────────────────────── */}
      {paso === 2 && (
        <div className="wiz__cuerpo wiz__cuerpo--simple">
          <h2 className="wiz__titulo">Repasa y confirma</h2>

          <div className="wiz__campos-contacto">
            <Input
              label="Teléfono de contacto"
              value={draft.contactPhone}
              onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
              hint="Por si cambia el viento y hay que avisarte."
            />
            <Input
              multiline
              label="¿Algo que debamos saber? (opcional)"
              rows={3}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </div>

          <div className="wiz__resumen-datos">
            <h3>Quién vuela</h3>
            <ul>
              {draft.lines.flatMap((l) =>
                l.attendees.map((a, i) => (
                  <li key={`${l.key}-${i}`}>
                    <strong>{a.fullName || "—"}</strong>
                    <span>
                      {a.idNumber || "—"} · {a.email || "—"}
                      {a.weightKg ? ` · ${a.weightKg} kg` : ""}
                    </span>
                  </li>
                )),
              )}
            </ul>
            <button type="button" className="wiz__rellenar" onClick={() => irAPaso(1)}>
              Editar los datos de las personas
            </button>
          </div>

          <div className="wiz__pago">
            <p>
              Al reservar apartamos tus plazas durante <strong>48 horas</strong>. Después haz la
              transferencia y sube el comprobante desde tu cuenta: en cuanto lo validemos, la
              reserva queda confirmada.
            </p>
          </div>

          <div className="wiz__cashea">
            <img
              src="/assets/logo-de-cashea.webp"
              alt="Cashea"
              className="wiz__cashea-logo"
            />
            <p>Puede pagar su vuelo en cómodas cuotas con Cashea.</p>
          </div>
        </div>
      )}

      {/* ── Resumen y navegación ─────────────────────────────────────────── */}
      <aside className="wiz__resumen">
        <h3>Tu reserva</h3>

        {draft.lines.length === 0 ? (
          <p className="wiz__resumen-vacio">
            Elige una experiencia y una hora, y pulsa «Añadir».
          </p>
        ) : (
          <ul className="wiz__resumen-lista">
            {draft.lines.map((l) => (
              <li key={l.key}>
                <div>
                  <strong>{l.serviceName}</strong>
                  <span>
                    {formatDayLong(l.slot.date)} · {l.slot.label}
                  </span>
                  <span className="wiz__resumen-plazas">
                    {lineSeats(l)} {lineSeats(l) === 1 ? "plaza" : "plazas"} · {l.priceDisplay} c/u
                  </span>
                  {lineExtrasCents(l) > 0 && (
                    <span className="wiz__resumen-extra">
                      Extras · +{formatMoney(lineExtrasCents(l), l.currency)}
                    </span>
                  )}
                  {companionInfo(l, settings).count > 0 && (
                    <span className="wiz__resumen-extra">
                      {companionInfo(l, settings).count}{" "}
                      {companionInfo(l, settings).count === 1 ? "acompañante" : "acompañantes"}
                      {companionInfo(l, settings).cents > 0
                        ? ` · +${formatMoney(companionInfo(l, settings).cents, l.currency)}`
                        : " · gratis"}
                    </span>
                  )}
                </div>

                <div className="wiz__resumen-tools">
                  {paso === 0 && (
                    <span className="wiz__cant">
                      <button
                        type="button"
                        aria-label="Quitar una"
                        onClick={() => setDraft((d) => setLineQuantity(d, l.key, l.quantity - 1))}
                      >
                        −
                      </button>
                      <span>{l.quantity}</span>
                      <button
                        type="button"
                        aria-label="Añadir una"
                        disabled={seatsAvailable(draft, l.slot) < l.seatsPerBooking}
                        onClick={() => setDraft((d) => setLineQuantity(d, l.key, l.quantity + 1))}
                      >
                        +
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Quitar"
                    className="wiz__quitar"
                    onClick={() => setDraft((d) => removeLine(d, l.key))}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft.lines.length > 0 && (
          <div className="wiz__resumen-total">
            <span>
              Total · {draftSeats(draft)} {draftSeats(draft) === 1 ? "plaza" : "plazas"}
            </span>
            <strong>{total?.display ?? "—"}</strong>
          </div>
        )}

        {/* Ni «Continuar» ni «Reservar» se desactivan: un botón muerto no dice
            qué falta. Al pulsarlos se valida y se lleva al campo que falla. */}
        <div className="wiz__nav">
          {paso > 0 && (
            <button type="button" className="wiz__atras" onClick={() => irAPaso(paso - 1)}>
              ← Atrás
            </button>
          )}

          {paso < 2 && (
            <Button size="md" onClick={() => irAPaso(paso + 1)}>
              Continuar
            </Button>
          )}

          {paso === 2 && (
            <Button size="md" disabled={enviando} onClick={enviar}>
              {enviando ? "Reservando…" : "Reservar"}
            </Button>
          )}
        </div>
      </aside>
    </section>
  );
}
