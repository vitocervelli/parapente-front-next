"use client";

import { useRef, useState, useTransition } from "react";

/** Lo que recibe cada fila para pintar sus botones de subir y bajar. */
export type SortControls = {
  up: () => void;
  down: () => void;
  first: boolean;
  last: boolean;
  saving: boolean;
};

/** Botones ↑↓ estándar para colocar dentro de las herramientas de la fila. */
export function MoveButtons({ label, controls }: { label: string; controls: SortControls }) {
  return (
    <div className="adm-row__move">
      <button
        type="button"
        aria-label={`Subir ${label}`}
        onClick={controls.up}
        disabled={controls.first || controls.saving}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`Bajar ${label}`}
        onClick={controls.down}
        disabled={controls.last || controls.saving}
      >
        ↓
      </button>
    </div>
  );
}

/**
 * Lista reordenable por arrastre para los catálogos del panel (aliados,
 * extras, elementos incluidos, localidades…). Arrastre nativo de HTML5, sin
 * librerías; el teclado también sirve con los botones de MoveButtons.
 *
 * El orden se guarda al pulsar «Guardar orden»: la action recibe los ids en el
 * orden final y el backend fija posición = índice.
 */
export function SortableList<T extends { id: number }>({
  items,
  action,
  hint,
  isStatic,
  children,
  footer,
}: {
  items: T[];
  action: (ids: number[]) => Promise<{ ok: true } | { ok: false; error: string }>;
  hint: string;
  /** Una fila estática (p. ej. con su formulario abierto) no se arrastra. */
  isStatic?: (item: T) => boolean;
  children: (item: T, index: number, controls: SortControls) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [rows, setRows] = useState(items);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // El drop puede llegar en el mismo ciclo de render que el dragstart; el ref
  // siempre está al día aunque el estado aún no.
  const draggingRef = useRef<number | null>(null);

  // Al revalidar, el servidor manda props nuevas: resincronizamos salvo que
  // haya un reordenado sin guardar que no queremos pisar.
  const [syncedFrom, setSyncedFrom] = useState(items);
  if (items !== syncedFrom) {
    setSyncedFrom(items);
    if (!dirty) setRows(items);
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
      const result = await action(rows.map((r) => r.id));
      if (result.ok) {
        setDirty(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="adm-items">
      <div className="adm-orderbar">
        <span className="adm-orderbar__hint">{hint}</span>
        {dirty && (
          <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar orden"}
          </button>
        )}
      </div>

      {error && <p className="adm-alert adm-alert--error">{error}</p>}

      {rows.map((item, index) => {
        const fixed = isStatic?.(item) ?? false;
        const controls: SortControls = {
          up: () => reorder(index, index - 1),
          down: () => reorder(index, index + 1),
          first: index === 0,
          last: index === rows.length - 1,
          saving,
        };

        return (
          <article
            key={item.id}
            draggable={!fixed}
            onDragStart={(e) => {
              draggingRef.current = index;
              setDragging(index);
              e.dataTransfer.effectAllowed = "move";
              // Firefox exige que se fije algún dato para iniciar el arrastre.
              e.dataTransfer.setData("text/plain", String(item.id));
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
              "adm-item",
              fixed ? "" : "adm-item--drag",
              dragging === index ? "adm-row--dragging" : "",
              over === index && dragging !== null && dragging !== index ? "adm-row--over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!fixed && (
              <span className="adm-row__grip" aria-hidden="true">
                ⠿
              </span>
            )}
            {fixed ? children(item, index, controls) : <div className="adm-item__row">{children(item, index, controls)}</div>}
          </article>
        );
      })}

      {footer}
    </div>
  );
}
