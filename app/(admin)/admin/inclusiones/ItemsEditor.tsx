"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteItemAction, saveItemAction, type FormState } from "../actions";
import { ICON_KEYS, InclusionIcon } from "@/components/ds/InclusionIcon";
import type { AdminItem } from "@/lib/admin-api";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

function ItemForm({ item, onDone }: { item: AdminItem | null; onDone?: () => void }) {
  const action = saveItemAction.bind(null, item?.id ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [icon, setIcon] = useState(item?.icon ?? "check");

  return (
    <form action={formAction} className="adm-item-form">
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}

      <div className="adm-item-form__grid">
        <label className="adm-field">
          <span>Texto</span>
          <input name="defaultLabel" defaultValue={item?.defaultLabel ?? ""} required />
        </label>

        <label className="adm-field">
          <span>Identificador</span>
          <input name="slug" defaultValue={item?.slug ?? ""} required />
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
          <input type="number" name="position" defaultValue={item?.position ?? 0} />
        </label>

        <span className="adm-item-form__preview">
          <InclusionIcon name={icon} />
        </span>
      </div>

      <div className="adm-actions">
        <SaveButton label={item ? "Guardar" : "Añadir"} />
        {onDone && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function DeleteItemForm({ id }: { id: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(deleteItemAction, null);

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

export function ItemsEditor({ items }: { items: AdminItem[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="adm-items">
      {items.map((item) => (
        <article key={item.id} className="adm-item">
          {editing === item.id ? (
            <ItemForm item={item} onDone={() => setEditing(null)} />
          ) : (
            <div className="adm-item__row">
              <span className="adm-item__icon">
                <InclusionIcon name={item.icon} />
              </span>
              <span className="adm-item__label">{item.defaultLabel}</span>
              <code className="adm-item__slug">{item.slug}</code>
              <div className="adm-item__tools">
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  onClick={() => setEditing(item.id)}
                >
                  Editar
                </button>
                <DeleteItemForm id={item.id} />
              </div>
            </div>
          )}
        </article>
      ))}

      {adding ? (
        <article className="adm-item">
          <ItemForm item={null} onDone={() => setAdding(false)} />
        </article>
      ) : (
        <button
          type="button"
          className="adm-btn adm-btn--primary adm-items__add"
          onClick={() => setAdding(true)}
        >
          Añadir elemento
        </button>
      )}
    </div>
  );
}
