"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDayLong } from "@/lib/availability";
import type { AdminBooking } from "@/lib/admin-api";

const TONO: Record<string, string> = {
  pending_payment: "res-estado--aviso",
  proof_submitted: "res-estado--espera",
  confirmed: "res-estado--ok",
  completed: "res-estado--ok",
  rejected: "res-estado--no",
  cancelled_by_admin: "res-estado--no",
  cancelled_by_customer: "res-estado--no",
  expired: "res-estado--no",
};

/** Minúsculas y sin tildes: "Pérez" encuentra "perez" y al revés. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Todo lo buscable de una reserva, en un solo texto normalizado. */
function pajar(r: AdminBooking): string {
  const partes: (string | null | undefined)[] = [
    r.reference,
    r.customer?.fullName,
    r.customer?.email,
    r.customer?.phone,
    r.contactPhone,
    r.statusLabel,
    r.total.display,
  ];

  for (const l of r.lines) {
    partes.push(l.serviceName);
    if (l.slot) partes.push(l.slot.date, formatDayLong(l.slot.date));
    if (l.flightDate) partes.push(l.flightDate, formatDayLong(l.flightDate));
    for (const a of l.attendees) {
      partes.push(a.fullName, a.idNumber, a.email);
    }
  }

  return normalizar(partes.filter(Boolean).join(" "));
}

/**
 * Listado de reservas con buscador instantáneo. El filtrado ocurre aquí, en el
 * navegador, sobre las reservas del filtro activo: la bandeja llega completa
 * del servidor (sin paginar) y así cada tecla responde al momento.
 */
export function BookingsTable({
  reservas,
  vistaVencidas,
}: {
  reservas: AdminBooking[];
  /** En el filtro «Vencidas» todas lo son por definición. */
  vistaVencidas: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");

  const pajares = useMemo(() => new Map(reservas.map((r) => [r.id, pajar(r)])), [reservas]);

  // Cada palabra escrita debe aparecer: "ana confirmada" exige ambas.
  const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const visibles =
    terminos.length === 0
      ? reservas
      : reservas.filter((r) => {
          const heno = pajares.get(r.id) ?? "";
          return terminos.every((t) => heno.includes(t));
        });

  const esVencida = (r: AdminBooking) => vistaVencidas || r.isOverdue;

  return (
    <>
      <div className="res-buscador">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo, cédula, referencia, servicio…"
          aria-label="Buscar reservas"
        />
        {busqueda && (
          <span className="res-buscador__conteo">
            {visibles.length} de {reservas.length}
          </span>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="adm-empty">
          {busqueda ? `Nada coincide con «${busqueda}» en este filtro.` : "No hay reservas en este filtro."}
        </p>
      ) : (
        <div className="adm-table">
          {visibles.map((r) => (
            <article key={r.id} className="adm-row adm-row--booking">
              <div className="adm-row__main">
                <span className="adm-row__titulo">
                  <Link href={`/admin/reservas/${r.id}`} className="adm-row__name">
                    {r.reference}
                  </Link>
                  <span className="adm-row__personas">
                    {r.people} {r.people === 1 ? "persona" : "personas"}
                  </span>
                </span>
                <span className="adm-row__meta">
                  {r.customer?.fullName ?? r.customer?.email ?? "—"} ·{" "}
                  {r.lines
                    .map((l) =>
                      l.slot
                        ? `${l.serviceName} (${formatDayLong(l.slot.date)} ${l.slot.label})`
                        : l.flightDate
                          ? `${l.serviceName} (${formatDayLong(l.flightDate)})`
                          : l.serviceName,
                    )
                    .join(" + ")}
                </span>
              </div>

              <span className="adm-row__estados">
                <span className={`res-estado ${TONO[r.status] ?? ""}`}>{r.statusLabel}</span>
                {r.isHistorical && <span className="res-estado res-estado--espera">Histórica</span>}
                {esVencida(r) && <span className="res-estado res-estado--no">Vencida</span>}
              </span>
              <span className="adm-row__price">{r.total.display}</span>

              <div className="adm-row__actions">
                <Link
                  href={`/admin/reservas/${r.id}`}
                  className={`adm-btn ${esVencida(r) ? "adm-btn--danger" : "adm-btn--ghost"}`}
                >
                  {esVencida(r) ? "Revisar y rechazar" : "Revisar"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
