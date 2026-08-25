"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteItemAction,
  reorderItemsAction,
  saveItemAction,
  type FormState,
} from "../actions";
import { MoveButtons, SortableList } from "../SortableList";
import { InclusionIcon } from "@/components/ds/InclusionIcon";
import type { AdminItem } from "@/lib/admin-api";
import { uploadImageDirect } from "@/lib/upload-client";
import { BACKEND_URL } from "@/lib/api";

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
  const [iconPath, setIconPath] = useState(item?.iconPath ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [errorIcono, setErrorIcono] = useState<string | null>(null);

  async function subirIcono(file: File) {
    setSubiendo(true);
    setErrorIcono(null);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadImageDirect("icons", data);

    if (result.ok) {
      setIconPath(result.path);
    } else {
      setErrorIcono(result.error);
    }
    setSubiendo(false);
  }

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
          <span>Orden</span>
          <input type="number" name="position" defaultValue={item?.position ?? 0} />
        </label>
      </div>

      {/* El icono es una imagen subida; la clave antigua viaja oculta como reserva. */}
      <input type="hidden" name="icon" value={item?.icon ?? "check"} />
      <div className="adm-field">
        <span>Icono</span>
        <input type="hidden" name="iconPath" value={iconPath} />
        <div className="adm-upload">
          <span className="adm-item-form__preview">
            {iconPath ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa directa, sin optimizar
              <img src={`${BACKEND_URL}${iconPath}`} alt="Icono del elemento" />
            ) : (
              <InclusionIcon name={item?.icon ?? "check"} />
            )}
          </span>
          <div className="adm-upload__controls">
            <input
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              disabled={subiendo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirIcono(file);
              }}
            />
            {subiendo && <span className="adm-hint">Subiendo…</span>}
          </div>
        </div>
        <span className="adm-hint">PNG, WebP o SVG cuadrado. Sube otro archivo para cambiarlo.</span>
        {errorIcono && <span className="adm-hint adm-hint--error">{errorIcono}</span>}
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
    <SortableList
      items={items}
      action={reorderItemsAction}
      hint="Arrastra las filas por el asa para cambiar el orden en que salen en la web."
      isStatic={(item) => editing === item.id}
      footer={
        adding ? (
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
        )
      }
    >
      {(item, _index, controls) =>
        editing === item.id ? (
          <ItemForm item={item} onDone={() => setEditing(null)} />
        ) : (
          <>
            <span className="adm-item__icon">
              {item.iconPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- icono subido, sin optimizar
                <img src={`${BACKEND_URL}${item.iconPath}`} alt="" />
              ) : (
                <InclusionIcon name={item.icon} />
              )}
            </span>
            <span className="adm-item__label">{item.defaultLabel}</span>
            <code className="adm-item__slug">{item.slug}</code>
            <div className="adm-item__tools">
              <MoveButtons label={item.defaultLabel} controls={controls} />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setEditing(item.id)}
              >
                Editar
              </button>
              <DeleteItemForm id={item.id} />
            </div>
          </>
        )
      }
    </SortableList>
  );
}
