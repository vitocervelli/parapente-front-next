"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteAllyAction,
  reorderAlliesAction,
  saveAllyAction,
  uploadImageAction,
  type FormState,
} from "../actions";
import { MoveButtons, SortableList } from "../SortableList";
import type { AdminAlly } from "@/lib/admin-api";
import { BACKEND_URL } from "@/lib/api";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

function AllyForm({ ally, onDone }: { ally: AdminAlly | null; onDone?: () => void }) {
  const action = saveAllyAction.bind(null, ally?.id ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [logoPath, setLogoPath] = useState(ally?.logoPath ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);

  const errors = state?.errors ?? {};

  async function subirLogo(file: File) {
    setSubiendo(true);
    setErrorLogo(null);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadImageAction("allies", data);

    if (result.ok) {
      setLogoPath(result.path);
    } else {
      setErrorLogo(result.error);
    }
    setSubiendo(false);
  }

  return (
    <form action={formAction} className="adm-item-form">
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}

      <div className="adm-item-form__grid">
        <label className="adm-field">
          <span>Nombre</span>
          <input name="name" defaultValue={ally?.name ?? ""} required />
          {errors.name && <span className="adm-hint adm-hint--error">{errors.name}</span>}
        </label>

        <label className="adm-field">
          <span>Qué es</span>
          <input name="kind" defaultValue={ally?.kind ?? ""} placeholder="Panadería, tienda…" />
        </label>

        <label className="adm-field">
          <span>Orden</span>
          <input type="number" name="position" defaultValue={ally?.position ?? 0} />
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isActive" defaultChecked={ally?.isActive ?? true} />
          <span>Visible en la portada</span>
        </label>
      </div>

      <div className="adm-field">
        <span>Logo (opcional)</span>
        <input type="hidden" name="logoPath" value={logoPath} />
        <div className="adm-upload">
          {logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa directa, sin optimizar
            <img className="adm-upload__preview" src={`${BACKEND_URL}${logoPath}`} alt="Logo del aliado" />
          ) : (
            <span className="adm-upload__empty">Sin logo</span>
          )}
          <div className="adm-upload__controls">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              disabled={subiendo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirLogo(file);
              }}
            />
            {subiendo && <span className="adm-hint">Subiendo…</span>}
            {logoPath && !subiendo && (
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setLogoPath("")}>
                Quitar (usar el nombre en rótulo)
              </button>
            )}
          </div>
        </div>
        <span className="adm-hint">Sin logo se muestra el nombre con el estilo de rótulo blanco.</span>
        {errorLogo && <span className="adm-hint adm-hint--error">{errorLogo}</span>}
      </div>

      <div className="adm-actions">
        <SaveButton label={ally ? "Guardar" : "Añadir"} />
        {onDone && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function DeleteAllyForm({ id }: { id: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(deleteAllyAction, null);

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

export function AlliesEditor({ allies }: { allies: AdminAlly[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <SortableList
      items={allies}
      action={reorderAlliesAction}
      hint="Arrastra las filas por el asa para cambiar el orden en que salen en la portada."
      isStatic={(ally) => editing === ally.id}
      footer={
        adding ? (
          <article className="adm-item">
            <AllyForm ally={null} onDone={() => setAdding(false)} />
          </article>
        ) : (
          <button
            type="button"
            className="adm-btn adm-btn--primary adm-items__add"
            onClick={() => setAdding(true)}
          >
            Añadir aliado
          </button>
        )
      }
    >
      {(ally, _index, controls) =>
        editing === ally.id ? (
          <AllyForm ally={ally} onDone={() => setEditing(null)} />
        ) : (
          <>
            <span className="adm-item__icon">
              {ally.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo subido, sin optimizar
                <img src={`${BACKEND_URL}${ally.logoPath}`} alt="" />
              ) : (
                <span className="adm-item__sinlogo" aria-hidden="true">Aa</span>
              )}
            </span>
            <span className="adm-item__label">
              {ally.name}
              {ally.kind && <em className="adm-hint"> · {ally.kind}</em>}
              {!ally.isActive && <em className="adm-hint"> · oculto</em>}
            </span>
            <div className="adm-item__tools">
              <MoveButtons label={ally.name} controls={controls} />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setEditing(ally.id)}
              >
                Editar
              </button>
              <DeleteAllyForm id={ally.id} />
            </div>
          </>
        )
      }
    </SortableList>
  );
}
