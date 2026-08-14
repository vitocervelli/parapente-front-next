"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteExtraAction, saveExtraAction, type FormState } from "../actions";
import { ICON_KEYS, InclusionIcon } from "@/components/ds/InclusionIcon";
import type { AdminExtra } from "@/lib/admin-api";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

/** Convierte un nombre en slug, para no tener que escribirlo a mano. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ExtraForm({ extra, onDone }: { extra: AdminExtra | null; onDone?: () => void }) {
  const action = saveExtraAction.bind(null, extra?.id ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [icon, setIcon] = useState(extra?.icon ?? "check");
  const [name, setName] = useState(extra?.name ?? "");
  const [slug, setSlug] = useState(extra?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(extra));

  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="adm-item-form">
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}

      <div className="adm-item-form__grid">
        <label className="adm-field">
          <span>Nombre</span>
          <input
            name="name"
            value={name}
            required
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </label>

        <label className="adm-field">
          <span>Identificador</span>
          <input
            name="slug"
            value={slug}
            required
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
          />
        </label>

        <label className="adm-field">
          <span>Precio (por persona)</span>
          <input name="priceAmount" defaultValue={extra?.price.amount ?? ""} placeholder="20" required />
        </label>

        <label className="adm-field">
          <span>Moneda</span>
          <select name="currency" defaultValue={extra?.currency ?? "EUR"}>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>

        <label className="adm-field">
          <span>Icono</span>
          <select name="icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICON_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label className="adm-field">
          <span>Orden</span>
          <input type="number" name="position" defaultValue={extra?.position ?? 0} />
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isActive" defaultChecked={extra?.isActive ?? true} />
          <span>Activo</span>
        </label>

        <span className="adm-item-form__preview">
          <InclusionIcon name={icon} />
        </span>
      </div>

      {errors.priceAmount && <p className="adm-hint adm-hint--error">{errors.priceAmount}</p>}

      <label className="adm-field">
        <span>Nota (opcional)</span>
        <input name="note" defaultValue={extra?.note ?? ""} placeholder="Detalle breve" />
      </label>

      <div className="adm-actions">
        <SaveButton label={extra ? "Guardar" : "Añadir"} />
        {onDone && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function DeleteExtraForm({ id }: { id: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(deleteExtraAction, null);

  return (
    <form action={formAction} className="adm-item__delete">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="adm-btn adm-btn--danger">
        Borrar
      </button>
      {state?.message && <span className="adm-hint adm-hint--error">{state.message}</span>}
    </form>
  );
}

export function ExtrasEditor({ extras }: { extras: AdminExtra[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="adm-items">
      {extras.map((extra) => (
        <article key={extra.id} className="adm-item">
          {editing === extra.id ? (
            <ExtraForm extra={extra} onDone={() => setEditing(null)} />
          ) : (
            <div className="adm-item__row">
              <span className="adm-item__icon">
                <InclusionIcon name={extra.icon} />
              </span>
              <span className="adm-item__label">
                {extra.name}
                {!extra.isActive && <em className="adm-hint"> · inactivo</em>}
              </span>
              <span className="adm-item__price">{extra.price.display}</span>
              <code className="adm-item__slug">{extra.slug}</code>
              <div className="adm-item__tools">
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  onClick={() => setEditing(extra.id)}
                >
                  Editar
                </button>
                <DeleteExtraForm id={extra.id} />
              </div>
            </div>
          )}
        </article>
      ))}

      {adding ? (
        <article className="adm-item">
          <ExtraForm extra={null} onDone={() => setAdding(false)} />
        </article>
      ) : (
        <button
          type="button"
          className="adm-btn adm-btn--primary adm-items__add"
          onClick={() => setAdding(true)}
        >
          Añadir extra
        </button>
      )}
    </div>
  );
}
