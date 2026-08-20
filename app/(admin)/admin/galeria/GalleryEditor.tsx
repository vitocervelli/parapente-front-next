"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteGalleryPhotoAction,
  reorderGalleryAction,
  saveGalleryPhotoAction,
  uploadImageAction,
  type FormState,
} from "../actions";
import { MoveButtons, SortableList } from "../SortableList";
import type { AdminGalleryPhoto } from "@/lib/admin-api";
import { BACKEND_URL } from "@/lib/api";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

function PhotoForm({ photo, onDone }: { photo: AdminGalleryPhoto | null; onDone?: () => void }) {
  const action = saveGalleryPhotoAction.bind(null, photo?.id ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [imagePath, setImagePath] = useState(photo?.imagePath ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const errors = state?.errors ?? {};

  async function subirFoto(file: File) {
    setSubiendo(true);
    setErrorFoto(null);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadImageAction("gallery", data);

    if (result.ok) {
      setImagePath(result.path);
    } else {
      setErrorFoto(result.error);
    }
    setSubiendo(false);
  }

  return (
    <form action={formAction} className="adm-item-form">
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}

      <div className="adm-field">
        <span>Imagen</span>
        <input type="hidden" name="imagePath" value={imagePath} />
        <div className="adm-upload">
          {imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa directa, sin optimizar
            <img className="adm-upload__preview" src={`${BACKEND_URL}${imagePath}`} alt="Foto de la galería" />
          ) : (
            <span className="adm-upload__empty">Sin imagen</span>
          )}
          <div className="adm-upload__controls">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={subiendo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirFoto(file);
              }}
            />
            {subiendo && <span className="adm-hint">Subiendo…</span>}
          </div>
        </div>
        {errors.imagePath && <span className="adm-hint adm-hint--error">{errors.imagePath}</span>}
        {errorFoto && <span className="adm-hint adm-hint--error">{errorFoto}</span>}
      </div>

      <div className="adm-item-form__grid">
        <label className="adm-field">
          <span>Descripción breve</span>
          <input name="alt" defaultValue={photo?.alt ?? ""} placeholder="Vuelo tándem sobre el valle" required />
          {errors.alt && <span className="adm-hint adm-hint--error">{errors.alt}</span>}
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isFeatured" defaultChecked={photo?.isFeatured ?? false} />
          <span>Destacada (polaroid grande)</span>
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isWide" defaultChecked={photo?.isWide ?? false} />
          <span>Ancha en la tira (apaisada)</span>
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isActive" defaultChecked={photo?.isActive ?? true} />
          <span>Visible en la web</span>
        </label>
      </div>

      <div className="adm-actions">
        <SaveButton label={photo ? "Guardar" : "Añadir"} />
        {onDone && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function DeletePhotoForm({ id }: { id: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(deleteGalleryPhotoAction, null);

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

export function GalleryEditor({ photos }: { photos: AdminGalleryPhoto[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <SortableList
      items={photos}
      action={reorderGalleryAction}
      hint="Arrastra las filas por el asa para cambiar el orden de las fotos en la galería."
      isStatic={(photo) => editing === photo.id}
      footer={
        adding ? (
          <article className="adm-item">
            <PhotoForm photo={null} onDone={() => setAdding(false)} />
          </article>
        ) : (
          <button
            type="button"
            className="adm-btn adm-btn--primary adm-items__add"
            onClick={() => setAdding(true)}
          >
            Añadir foto
          </button>
        )
      }
    >
      {(photo, _index, controls) =>
        editing === photo.id ? (
          <PhotoForm photo={photo} onDone={() => setEditing(null)} />
        ) : (
          <>
            <span className="adm-item__icon adm-item__icon--foto">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar */}
              <img src={`${BACKEND_URL}${photo.imagePath}`} alt="" loading="lazy" />
            </span>
            <span className="adm-item__label">
              {photo.alt}
              {photo.isFeatured && <em className="adm-hint"> · destacada</em>}
              {photo.isWide && <em className="adm-hint"> · ancha</em>}
              {!photo.isActive && <em className="adm-hint"> · oculta</em>}
            </span>
            <div className="adm-item__tools">
              <MoveButtons label={photo.alt} controls={controls} />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setEditing(photo.id)}
              >
                Editar
              </button>
              <DeletePhotoForm id={photo.id} />
            </div>
          </>
        )
      }
    </SortableList>
  );
}
