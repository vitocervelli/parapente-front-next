"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteServiceAction, reorderServicesAction, toggleHomeAction } from "./actions";
import { mediaUrl, type Service } from "@/lib/api";

/**
 * Listado ordenable. Usa el arrastre nativo de HTML5 en vez de una librería:
 * es una lista vertical de pocas filas y así no añadimos dependencias.
 * El teclado también sirve — cada fila tiene botones de subir y bajar.
 */
export function ServiceList({ services }: { services: Service[] }) {
  const [rows, setRows] = useState(services);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  /**
   * El índice de origen va también en un ref: el `drop` puede llegar en el
   * mismo ciclo de render que el `dragstart`, y entonces el estado todavía
   * valdría null. El ref se actualiza al momento.
   */
  const draggingRef = useRef<number | null>(null);

  /**
   * `useState` solo toma su valor inicial en el primer montaje. Cuando una
   * server action revalida /admin, el servidor manda props nuevas y la lista
   * se quedaría enseñando las viejas. Al cambiar la prop, resincronizamos —
   * salvo que haya un reordenado sin guardar, que no queremos pisar.
   */
  const [syncedFrom, setSyncedFrom] = useState(services);
  if (services !== syncedFrom) {
    setSyncedFrom(services);
    if (!dirty) setRows(services);
  }

  function reorder(from: number, to: number) {
    if (from === to || to < 0 || to >= rows.length) return;

    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
    setError(null);
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await reorderServicesAction(rows.map((r) => r.id));
      if (result.ok) {
        setDirty(false);
      } else {
        setError(result.error);
      }
    });
  }

  function toggleHome(service: Service) {
    setError(null);
    // Optimista: la fila responde al instante y se revierte si el guardado falla.
    setRows((prev) =>
      prev.map((r) => (r.id === service.id ? { ...r, showOnHome: !r.showOnHome } : r)),
    );

    startSaving(async () => {
      const result = await toggleHomeAction(service.id, !service.showOnHome);
      if (!result.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === service.id ? { ...r, showOnHome: service.showOnHome } : r)),
        );
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="adm-orderbar">
        <span className="adm-orderbar__hint">
          Arrastra las filas por el asa para cambiar el orden en que salen en la web.
        </span>
        {dirty && (
          <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar orden"}
          </button>
        )}
      </div>

      {error && <p className="adm-alert adm-alert--error">{error}</p>}

      <div className="adm-table">
        {rows.map((s, index) => (
          <article
            key={s.id}
            draggable
            onDragStart={(e) => {
              draggingRef.current = index;
              setDragging(index);
              e.dataTransfer.effectAllowed = "move";
              // Firefox exige que se fije algún dato para iniciar el arrastre.
              e.dataTransfer.setData("text/plain", String(s.id));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (over !== index) setOver(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = draggingRef.current;
              if (from !== null) reorder(from, index);
              draggingRef.current = null;
              setDragging(null);
              setOver(null);
            }}
            onDragEnd={() => {
              draggingRef.current = null;
              setDragging(null);
              setOver(null);
            }}
            className={[
              "adm-row",
              "adm-row--draggable",
              s.isActive ? "" : "adm-row--off",
              dragging === index ? "adm-row--dragging" : "",
              over === index && dragging !== null && dragging !== index ? "adm-row--over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="adm-row__grip" aria-hidden="true">
              ⠿
            </span>

            <div className="adm-row__media">
              {s.image ? (
                <Image src={mediaUrl(s.image)!} alt="" width={160} height={120} sizes="80px" />
              ) : (
                <span className="adm-row__noimg">Sin foto</span>
              )}
            </div>

            <div className="adm-row__main">
              <Link href={`/admin/servicios/${s.id}`} className="adm-row__name">
                {s.name}
              </Link>
              <span className="adm-row__meta">
                {s.type === "standalone" ? "Servicio" : "Promoción"} · {s.people}{" "}
                {s.people === 1 ? "persona" : "personas"} · {s.inclusionsCount} incluye
                {s.isActive ? "" : " · oculto en la web"}
              </span>
              <span className="adm-row__zonas">
                {s.locations.length > 0 ? (
                  s.locations.map((l) => (
                    <span key={l.id} className="adm-loc-tag">
                      {l.name}
                    </span>
                  ))
                ) : (
                  <span className="adm-loc-tag adm-loc-tag--empty">Sin localidad</span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleHome(s)}
              disabled={saving}
              aria-pressed={s.showOnHome}
              title={
                s.showOnHome ? "Sale en la portada — clic para quitarla" : "Clic para sacarla en la portada"
              }
              className={`adm-chip${s.showOnHome ? " adm-chip--on" : ""}`}
            >
              {s.showOnHome ? "En portada" : "Fuera de portada"}
            </button>

            <span className="adm-row__price">{s.price.display}</span>

            <div className="adm-row__actions">
              <div className="adm-row__move">
                <button
                  type="button"
                  aria-label={`Subir ${s.name}`}
                  onClick={() => reorder(index, index - 1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${s.name}`}
                  onClick={() => reorder(index, index + 1)}
                  disabled={index === rows.length - 1}
                >
                  ↓
                </button>
              </div>
              <Link href={`/admin/servicios/${s.id}`} className="adm-btn adm-btn--ghost">
                Editar
              </Link>
              <form action={deleteServiceAction}>
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" className="adm-btn adm-btn--danger">
                  Borrar
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
