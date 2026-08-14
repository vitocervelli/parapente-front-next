"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { copyDayAction, saveDayAction } from "./actions";
import type { AdminLocation } from "@/lib/admin-api";
import {
  formatDayLong,
  formatMonth,
  fromDateKey,
  toDateKey,
  type AvailabilityDay,
  type Slot,
} from "@/lib/availability";

type Row = {
  key: string;
  id: number | null;
  startTime: string;
  endTime: string;
  capacity: number;
  isOpen: boolean;
  note: string;
  seatsBooked: number;
};

const CABECERAS = ["L", "M", "X", "J", "V", "S", "D"];

/** Indexado por getDay(): 0 = domingo. */
const DIAS_PLURAL = [
  "domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados",
];

/** Plantilla de partida al abrir un día vacío. */
const FRANJA_NUEVA = { startTime: "09:00", endTime: "10:00", capacity: 10 };

function slotToRow(slot: Slot): Row {
  return {
    key: `s${slot.id}`,
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    isOpen: slot.isOpen,
    note: slot.note ?? "",
    seatsBooked: slot.seatsBooked ?? 0,
  };
}

/** Suma una hora a "HH:MM" sin salir del día. */
function masUnaHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AvailabilityManager({
  initialDays,
  locations,
  location,
}: {
  initialDays: AvailabilityDay[];
  locations: AdminLocation[];
  location: string;
}) {
  const [daysMap, setDaysMap] = useState<Record<string, Slot[]>>(() =>
    Object.fromEntries(initialDays.map((d) => [d.date, d.slots])),
  );

  const hoy = useMemo(() => new Date(), []);
  const hoyKey = toDateKey(hoy);

  const [cursor, setCursor] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [semanas, setSemanas] = useState(4);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  /** Celdas del mes visible, con huecos delante para cuadrar el lunes. */
  const celdas = useMemo(() => {
    const primero = new Date(cursor.year, cursor.month, 1);
    const diasEnMes = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const hueco = (primero.getDay() + 6) % 7; // getDay(): 0 = domingo

    const out: (string | null)[] = Array.from({ length: hueco }, () => null);
    for (let d = 1; d <= diasEnMes; d++) {
      out.push(toDateKey(new Date(cursor.year, cursor.month, d)));
    }
    return out;
  }, [cursor]);

  function abrirDia(key: string) {
    setSelected(key);
    setRows((daysMap[key] ?? []).map(slotToRow));
    setDirty(false);
    setError(null);
    setMensaje(null);
  }

  function añadirFranja() {
    const ultima = rows.at(-1);
    const inicio = ultima ? masUnaHora(ultima.endTime) : FRANJA_NUEVA.startTime;

    setRows((prev) => [
      ...prev,
      {
        key: `n${Date.now()}${prev.length}`,
        id: null,
        startTime: inicio,
        endTime: masUnaHora(inicio),
        capacity: ultima?.capacity ?? FRANJA_NUEVA.capacity,
        isOpen: true,
        note: "",
        seatsBooked: 0,
      },
    ]);
    setDirty(true);
  }

  function editar(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setDirty(true);
    setError(null);
  }

  function quitar(index: number) {
    const fila = rows[index];

    // Una franja con reservas no se puede quitar de la lista: el backend la
    // cerraría en vez de borrarla, y el resultado sorprendería.
    if (fila.seatsBooked > 0) {
      setError(`La franja ${fila.startTime} tiene ${fila.seatsBooked} plazas reservadas. Ciérrala en vez de quitarla.`);
      return;
    }

    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function guardar() {
    if (!selected) return;
    setError(null);
    setMensaje(null);

    startTransition(async () => {
      const result = await saveDayAction(
        location,
        selected,
        rows.map((r) => ({
          startTime: r.startTime,
          endTime: r.endTime,
          capacity: Number(r.capacity) || 0,
          isOpen: r.isOpen,
          note: r.note.trim() || null,
        })),
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Refleja el guardado en el calendario sin recargar la página.
      setDaysMap((prev) => ({
        ...prev,
        [selected]: rows.map((r, i) => ({
          id: r.id ?? -1 - i,
          date: selected,
          startTime: r.startTime,
          endTime: r.endTime,
          label: `${r.startTime}–${r.endTime}`,
          capacity: Number(r.capacity) || 0,
          seatsFree: Math.max(0, (Number(r.capacity) || 0) - r.seatsBooked),
          isOpen: r.isOpen,
          note: r.note.trim() || null,
          seatsBooked: r.seatsBooked,
        })),
      }));
      setDirty(false);
      setMensaje("Horarios guardados.");
    });
  }

  function copiar() {
    if (!selected) return;
    setError(null);
    setMensaje(null);

    // A los próximos N mismos días de la semana: si montas un sábado, se copia
    // a los sábados siguientes, que es como se organiza la temporada.
    const origen = fromDateKey(selected);
    const destinos: string[] = [];
    for (let i = 1; i <= semanas; i++) {
      const d = new Date(origen);
      d.setDate(d.getDate() + 7 * i);
      destinos.push(toDateKey(d));
    }

    startTransition(async () => {
      const result = await copyDayAction(location, selected, destinos);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMensaje(
        `Copiado a ${semanas} ${semanas === 1 ? "semana" : "semanas"}: ${result.created} franjas creadas` +
          (result.skipped > 0 ? `, ${result.skipped} omitidas porque ya existían.` : "."),
      );

      // El calendario se refresca al recargar; se avisa para no mentir.
      setDaysMap((prev) => {
        const next = { ...prev };
        for (const destino of destinos) {
          if (!next[destino]?.length) {
            next[destino] = rows.map((r, i) => ({
              id: -1000 - i,
              date: destino,
              startTime: r.startTime,
              endTime: r.endTime,
              label: `${r.startTime}–${r.endTime}`,
              capacity: Number(r.capacity) || 0,
              seatsFree: Number(r.capacity) || 0,
              isOpen: r.isOpen,
              note: r.note.trim() || null,
              seatsBooked: 0,
            }));
          }
        }
        return next;
      });
    });
  }

  const totalPlazas = rows.reduce((suma, r) => suma + (r.isOpen ? Number(r.capacity) || 0 : 0), 0);

  return (
    <div className="disp">
      {locations.length > 1 && (
        <div className="disp__zonas" role="group" aria-label="Localidad">
          {locations.map((l) => (
            <Link
              key={l.slug}
              href={`/admin/disponibilidad?loc=${l.slug}`}
              className={`disp__zona${l.slug === location ? " disp__zona--sel" : ""}`}
              aria-current={l.slug === location ? "true" : undefined}
            >
              {l.name}
            </Link>
          ))}
        </div>
      )}

      <section className="disp__cal">
        <header className="disp__calhead">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() =>
              setCursor((c) =>
                c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
              )
            }
          >
            ←
          </button>
          <span>{formatMonth(cursor.year, cursor.month)}</span>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() =>
              setCursor((c) =>
                c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
              )
            }
          >
            →
          </button>
        </header>

        <div className="disp__grid" role="grid">
          {CABECERAS.map((c) => (
            <span key={c} className="disp__dow">
              {c}
            </span>
          ))}

          {celdas.map((key, i) => {
            if (key === null) return <span key={`h${i}`} className="disp__hueco" />;

            const slots = daysMap[key] ?? [];
            const abiertas = slots.filter((s) => s.isOpen);
            const plazas = abiertas.reduce((n, s) => n + s.capacity, 0);
            const pasado = key < hoyKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => abrirDia(key)}
                className={[
                  "disp__dia",
                  selected === key ? "disp__dia--sel" : "",
                  key === hoyKey ? "disp__dia--hoy" : "",
                  pasado ? "disp__dia--pasado" : "",
                  abiertas.length > 0 ? "disp__dia--con" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="disp__num">{fromDateKey(key).getDate()}</span>
                {abiertas.length > 0 && <span className="disp__plazas">{plazas}</span>}
              </button>
            );
          })}
        </div>

        <p className="disp__leyenda">
          El número pequeño son las plazas abiertas de ese día.
        </p>
      </section>

      <section className="disp__dia-panel">
        {selected === null ? (
          <p className="adm-empty">Elige un día en el calendario.</p>
        ) : (
          <>
            <header className="disp__panelhead">
              <div>
                <h2 className="disp__titulo">{formatDayLong(selected)}</h2>
                <span className="adm-sub">
                  {rows.length === 0
                    ? "Sin horarios"
                    : `${rows.length} ${rows.length === 1 ? "franja" : "franjas"} · ${totalPlazas} plazas abiertas`}
                </span>
              </div>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={añadirFranja}>
                Añadir franja
              </button>
            </header>

            {error && <p className="adm-alert adm-alert--error">{error}</p>}
            {mensaje && <p className="adm-alert adm-alert--ok">{mensaje}</p>}

            {rows.length === 0 ? (
              <p className="adm-empty">Este día no tiene horarios. Añade el primero.</p>
            ) : (
              <ul className="disp__franjas">
                {rows.map((row, index) => (
                  <li key={row.key} className={`disp__franja${row.isOpen ? "" : " disp__franja--off"}`}>
                    <input
                      type="time"
                      aria-label="Hora de inicio"
                      value={row.startTime}
                      onChange={(e) => editar(index, { startTime: e.target.value })}
                    />
                    <span className="disp__sep">–</span>
                    <input
                      type="time"
                      aria-label="Hora de fin"
                      value={row.endTime}
                      onChange={(e) => editar(index, { endTime: e.target.value })}
                    />

                    <label className="disp__cupo">
                      <input
                        type="number"
                        min={row.seatsBooked}
                        max={500}
                        aria-label="Plazas"
                        value={row.capacity}
                        onChange={(e) => editar(index, { capacity: Number(e.target.value) })}
                      />
                      <span>plazas</span>
                    </label>

                    {row.seatsBooked > 0 && (
                      <span className="disp__reservadas">{row.seatsBooked} reservadas</span>
                    )}

                    <button
                      type="button"
                      className={`adm-chip${row.isOpen ? " adm-chip--on" : ""}`}
                      onClick={() => editar(index, { isOpen: !row.isOpen })}
                    >
                      {row.isOpen ? "Abierta" : "Cerrada"}
                    </button>

                    <button
                      type="button"
                      className="disp__quitar"
                      aria-label={`Quitar franja de las ${row.startTime}`}
                      onClick={() => quitar(index)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="disp__acciones">
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                onClick={guardar}
                disabled={!dirty || pendiente}
              >
                {pendiente ? "Guardando…" : "Guardar el día"}
              </button>

              {rows.length > 0 && !dirty && (
                <div className="disp__copiar">
                  <span>Copiar a los próximos</span>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={semanas}
                    onChange={(e) => setSemanas(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Número de semanas"
                  />
                  <span>{DIAS_PLURAL[fromDateKey(selected).getDay()]}</span>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={copiar}
                    disabled={pendiente}
                  >
                    Copiar
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
