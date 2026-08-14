"use client";

import { useMemo, useState } from "react";
import {
  formatDayLong,
  formatMonth,
  fromDateKey,
  toDateKey,
  type AvailabilityDay,
  type Slot,
} from "@/lib/availability";

const CABECERAS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Calendario y franjas, construido a mano.
 *
 * Se descarta instalar un date-picker: el proyecto tiene tres dependencias de
 * producción, ninguna librería trae la noción de "plazas libres por franja" que
 * es justo lo que hay que enseñar, y tematizarla costaría más que esta rejilla.
 *
 * `libresEn` viene de fuera porque las plazas que quedan de verdad son las del
 * servidor MENOS las que ya has metido en el borrador.
 */
export function SlotPicker({
  days,
  seatsNeeded,
  selectedSlotId,
  onSelect,
  libresEn,
}: {
  days: AvailabilityDay[];
  seatsNeeded: number;
  selectedSlotId: number | null;
  onSelect: (slot: Slot) => void;
  libresEn: (slot: Slot) => number;
}) {
  const porFecha = useMemo(
    () => Object.fromEntries(days.map((d) => [d.date, d.slots])),
    [days],
  );

  const hoy = useMemo(() => new Date(), []);
  const hoyKey = toDateKey(hoy);

  const primerDiaConHueco = useMemo(
    () => days.find((d) => d.slots.some((s) => s.isOpen && libresEn(s) >= seatsNeeded))?.date ?? null,
    [days, seatsNeeded, libresEn],
  );

  const [cursor, setCursor] = useState(() => {
    const base = primerDiaConHueco ? fromDateKey(primerDiaConHueco) : hoy;
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [dia, setDia] = useState<string | null>(primerDiaConHueco);

  const celdas = useMemo(() => {
    const primero = new Date(cursor.year, cursor.month, 1);
    const total = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const hueco = (primero.getDay() + 6) % 7;

    const out: (string | null)[] = Array.from({ length: hueco }, () => null);
    for (let d = 1; d <= total; d++) {
      out.push(toDateKey(new Date(cursor.year, cursor.month, d)));
    }
    return out;
  }, [cursor]);

  const franjas = dia ? (porFecha[dia] ?? []) : [];

  return (
    <div className="picker">
      <div className="picker__cal">
        <header className="picker__calhead">
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

        <div className="picker__grid">
          {CABECERAS.map((c) => (
            <span key={c} className="picker__dow">
              {c}
            </span>
          ))}

          {celdas.map((key, i) => {
            if (key === null) return <span key={`h${i}`} />;

            const slots = porFecha[key] ?? [];
            const conSitio = slots.filter((s) => s.isOpen && libresEn(s) >= seatsNeeded);
            const disponible = conSitio.length > 0 && key >= hoyKey;

            return (
              <button
                key={key}
                type="button"
                disabled={!disponible}
                onClick={() => setDia(key)}
                className={[
                  "picker__dia",
                  disponible ? "picker__dia--libre" : "",
                  dia === key ? "picker__dia--sel" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {fromDateKey(key).getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="picker__horas">
        {dia === null ? (
          <p className="picker__vacio">
            No queda ningún día con {seatsNeeded} {seatsNeeded === 1 ? "plaza libre" : "plazas libres"}{" "}
            seguidas en las próximas semanas. Prueba con menos unidades o escríbenos.
          </p>
        ) : (
          <>
            <h3 className="picker__titulo">{formatDayLong(dia)}</h3>
            <ul className="picker__lista">
              {franjas.map((slot) => {
                const libres = libresEn(slot);
                const cabe = slot.isOpen && libres >= seatsNeeded;
                const yaElegida = selectedSlotId === slot.id;

                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      disabled={!cabe}
                      onClick={() => onSelect(slot)}
                      aria-pressed={yaElegida}
                      className={`picker__hora${yaElegida ? " picker__hora--sel" : ""}`}
                    >
                      <span className="picker__rango">{slot.label}</span>
                      <span className="picker__libres">
                        {libres === 0
                          ? "Sin plazas"
                          : `${libres} ${libres === 1 ? "plaza libre" : "plazas libres"}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
