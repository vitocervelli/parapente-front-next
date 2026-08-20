"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteExtraAction, reorderExtrasAction, saveExtraAction, uploadImageAction, type FormState } from "../actions";
import { MoveButtons, SortableList } from "../SortableList";
import { InclusionIcon } from "@/components/ds/InclusionIcon";
import type { AdminExtra } from "@/lib/admin-api";
import { BACKEND_URL } from "@/lib/api";

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
  const [iconPath, setIconPath] = useState(extra?.iconPath ?? "");
  const [subiendoIcono, setSubiendoIcono] = useState(false);
  const [errorIcono, setErrorIcono] = useState<string | null>(null);
  const [name, setName] = useState(extra?.name ?? "");
  const [slug, setSlug] = useState(extra?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(extra));

  const errors = state?.errors ?? {};

  async function subirIcono(file: File) {
    setSubiendoIcono(true);
    setErrorIcono(null);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadImageAction("icons", data);

    if (result.ok) {
      setIconPath(result.path);
    } else {
      setErrorIcono(result.error);
    }
    setSubiendoIcono(false);
  }

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
          <span>Orden</span>
          <input type="number" name="position" defaultValue={extra?.position ?? 0} />
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isActive" defaultChecked={extra?.isActive ?? true} />
          <span>Activo</span>
        </label>
      </div>

      {/* El icono es una imagen subida; la clave antigua viaja oculta como reserva. */}
      <input type="hidden" name="icon" value={extra?.icon ?? "check"} />
      <div className="adm-field">
        <span>Icono</span>
        <input type="hidden" name="iconPath" value={iconPath} />
        <div className="adm-upload">
          <span className="adm-item-form__preview">
            {iconPath ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa directa, sin optimizar
              <img src={`${BACKEND_URL}${iconPath}`} alt="Icono del extra" />
            ) : (
              <InclusionIcon name={extra?.icon ?? "check"} />
            )}
          </span>
          <div className="adm-upload__controls">
            <input
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              disabled={subiendoIcono}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirIcono(file);
              }}
            />
            {subiendoIcono && <span className="adm-hint">Subiendo…</span>}
          </div>
        </div>
        <span className="adm-hint">PNG, WebP o SVG cuadrado. Sube otro archivo para cambiarlo.</span>
        {errorIcono && <span className="adm-hint adm-hint--error">{errorIcono}</span>}
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
    <SortableList
      items={extras}
      action={reorderExtrasAction}
      hint="Arrastra las filas por el asa para cambiar el orden en que salen al reservar."
      isStatic={(extra) => editing === extra.id}
      footer={
        adding ? (
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
        )
      }
    >
      {(extra, _index, controls) =>
        editing === extra.id ? (
          <ExtraForm extra={extra} onDone={() => setEditing(null)} />
        ) : (
          <>
            <span className="adm-item__icon">
              {extra.iconPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- icono subido, sin optimizar
                <img src={`${BACKEND_URL}${extra.iconPath}`} alt="" />
              ) : (
                <InclusionIcon name={extra.icon} />
              )}
            </span>
            <span className="adm-item__label">
              {extra.name}
              {!extra.isActive && <em className="adm-hint"> · inactivo</em>}
            </span>
            <span className="adm-item__price">{extra.price.display}</span>
            <code className="adm-item__slug">{extra.slug}</code>
            <div className="adm-item__tools">
              <MoveButtons label={extra.name} controls={controls} />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setEditing(extra.id)}
              >
                Editar
              </button>
              <DeleteExtraForm id={extra.id} />
            </div>
          </>
        )
      }
    </SortableList>
  );
}
