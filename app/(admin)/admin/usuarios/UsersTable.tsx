"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminUser } from "@/lib/admin-api";

/** Minúsculas y sin tildes: "Pérez" encuentra "perez" y al revés. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Todo lo buscable de un usuario, en un solo texto normalizado. */
function pajar(u: AdminUser): string {
  return normalizar(
    [u.fullName, u.email, u.phone, u.idNumber].filter(Boolean).join(" "),
  );
}

function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Listado de clientes con buscador instantáneo. El filtrado ocurre en el
 * navegador sobre la lista completa que llega del servidor: cada tecla responde
 * al momento.
 */
export function UsersTable({ usuarios }: { usuarios: AdminUser[] }) {
  const [busqueda, setBusqueda] = useState("");

  const pajares = useMemo(() => new Map(usuarios.map((u) => [u.id, pajar(u)])), [usuarios]);

  const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const visibles =
    terminos.length === 0
      ? usuarios
      : usuarios.filter((u) => {
          const heno = pajares.get(u.id) ?? "";
          return terminos.every((t) => heno.includes(t));
        });

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
          placeholder="Buscar por nombre, correo, cédula o teléfono…"
          aria-label="Buscar clientes"
        />
        {busqueda && (
          <span className="res-buscador__conteo">
            {visibles.length} de {usuarios.length}
          </span>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="adm-empty">
          {busqueda ? `Nada coincide con «${busqueda}».` : "No hay clientes registrados todavía."}
        </p>
      ) : (
        <div className="adm-table">
          {visibles.map((u) => (
            <article key={u.id} className="adm-row">
              <div className="adm-row__main">
                <span className="adm-row__titulo">
                  <Link href={`/admin/usuarios/${u.id}`} className="adm-row__name">
                    {u.fullName ?? u.email}
                  </Link>
                  {u.isAdmin && <span className="res-estado res-estado--espera">Admin</span>}
                </span>
                <span className="adm-row__meta">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                  {u.idNumber ? ` · ${u.idNumber}` : ""}
                </span>
              </div>

              <span className="adm-row__estados">
                <span className="res-estado res-estado--ok">
                  {u.bookingsCount} {u.bookingsCount === 1 ? "reserva" : "reservas"}
                </span>
              </span>
              <span className="adm-row__price">Alta: {formatFecha(u.createdAt)}</span>

              <div className="adm-row__actions">
                <Link href={`/admin/usuarios/${u.id}`} className="adm-btn adm-btn--ghost">
                  Ver reservas
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
