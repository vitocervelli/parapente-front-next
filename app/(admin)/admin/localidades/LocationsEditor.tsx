"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteLocationAction, reorderLocationsAction, saveLocationAction, type FormState } from "../actions";
import { MoveButtons, SortableList } from "../SortableList";
import type { AdminLocation } from "@/lib/admin-api";

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

function LocationForm({ location, onDone }: { location: AdminLocation | null; onDone?: () => void }) {
  const action = saveLocationAction.bind(null, location?.id ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [name, setName] = useState(location?.name ?? "");
  const [slug, setSlug] = useState(location?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(location));

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
          {errors.slug && <span className="adm-hint adm-hint--error">{errors.slug}</span>}
        </label>

        <label className="adm-field">
          <span>Región</span>
          <input name="region" defaultValue={location?.region ?? ""} placeholder="Estado Yaracuy" />
        </label>

        <label className="adm-field">
          <span>Etiqueta</span>
          <input name="badge" defaultValue={location?.badge ?? ""} placeholder="Sede principal" />
        </label>

        <label className="adm-field">
          <span>Orden</span>
          <input type="number" name="position" defaultValue={location?.position ?? 0} />
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isActive" defaultChecked={location?.isActive ?? true} />
          <span>Activa</span>
        </label>
      </div>

      <label className="adm-field">
        <span>Descripción</span>
        <input
          name="description"
          defaultValue={location?.description ?? ""}
          placeholder="Breve descripción de la zona"
        />
      </label>

      <div className="adm-actions">
        <SaveButton label={location ? "Guardar" : "Añadir"} />
        {onDone && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function DeleteLocationForm({ id }: { id: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(deleteLocationAction, null);

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

export function LocationsEditor({ locations }: { locations: AdminLocation[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <SortableList
      items={locations}
      action={reorderLocationsAction}
      hint="Arrastra las filas por el asa para cambiar el orden en que salen en la web."
      isStatic={(loc) => editing === loc.id}
      footer={
        adding ? (
          <article className="adm-item">
            <LocationForm location={null} onDone={() => setAdding(false)} />
          </article>
        ) : (
          <button
            type="button"
            className="adm-btn adm-btn--primary adm-items__add"
            onClick={() => setAdding(true)}
          >
            Añadir localidad
          </button>
        )
      }
    >
      {(loc, _index, controls) =>
        editing === loc.id ? (
          <LocationForm location={loc} onDone={() => setEditing(null)} />
        ) : (
          <>
            <span className="adm-item__label">
              {loc.name}
              {loc.badge && <em className="adm-hint"> · {loc.badge}</em>}
              {!loc.isActive && <em className="adm-hint"> · inactiva</em>}
            </span>
            <code className="adm-item__slug">{loc.slug}</code>
            <div className="adm-item__tools">
              <MoveButtons label={loc.name} controls={controls} />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setEditing(loc.id)}
              >
                Editar
              </button>
              <DeleteLocationForm id={loc.id} />
            </div>
          </>
        )
      }
    </SortableList>
  );
}
