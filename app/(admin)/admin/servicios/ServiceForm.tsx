"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadImageAction, type FormState } from "../actions";
import { InclusionIcon } from "@/components/ds/InclusionIcon";
import type { AdminExtra, AdminItem, AdminLocation } from "@/lib/admin-api";
import { BACKEND_URL, type Service } from "@/lib/api";

type Row = { key: string; itemId: number; labelOverride: string };

type Props = {
  service: Service | null;
  items: AdminItem[];
  extras: AdminExtra[];
  locations: AdminLocation[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
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

/** Campo de imagen: sube el archivo al backend y guarda la ruta devuelta. */
function ImageField({
  label,
  name,
  initial,
  folder,
}: {
  label: string;
  name: string;
  initial: string | null;
  folder: "services" | "flyers";
}) {
  const [path, setPath] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadImageAction(folder, data);

    if (result.ok) {
      setPath(result.path);
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <div className="adm-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={path} />
      <div className="adm-upload">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa directa, sin optimizar
          <img className="adm-upload__preview" src={`${BACKEND_URL}${path}`} alt="" />
        ) : (
          <span className="adm-upload__empty">Sin imagen</span>
        )}
        <div className="adm-upload__controls">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {busy && <span className="adm-hint">Subiendo…</span>}
          {path && !busy && (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setPath("")}>
              Quitar
            </button>
          )}
        </div>
      </div>
      {error && <span className="adm-hint adm-hint--error">{error}</span>}
    </div>
  );
}

export function ServiceForm({ service, items, extras, locations, action }: Props) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);

  const extrasSeleccionados = new Set(service?.extras.map((e) => e.id) ?? []);
  const localidadesSeleccionadas = new Set(service?.locationIds ?? []);

  const [name, setName] = useState(service?.name ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(service));

  const [rows, setRows] = useState<Row[]>(
    service?.inclusions.map((i, n) => ({
      key: `${i.id}-${n}`,
      itemId: i.itemId ?? 0,
      labelOverride: i.labelOverride ?? "",
    })) ?? [],
  );

  const errors = state?.errors ?? {};

  function addRow() {
    if (items.length === 0) return;
    setRows((prev) => [
      ...prev,
      { key: `nuevo-${Date.now()}-${prev.length}`, itemId: items[0].id, labelOverride: "" },
    ]);
  }

  function move(index: number, delta: number) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="adm-form adm-form--wide">
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}

      <section className="adm-card">
        <h2 className="adm-card__title">Datos</h2>
        <div className="adm-grid">
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
            {errors.name && <span className="adm-hint adm-hint--error">{errors.name}</span>}
          </label>

          <label className="adm-field">
            <span>Identificador (URL)</span>
            <input
              name="slug"
              value={slug}
              required
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            {errors.slug && <span className="adm-hint adm-hint--error">{errors.slug}</span>}
          </label>

          <label className="adm-field">
            <span>Tipo</span>
            <select name="type" defaultValue={service?.type ?? "promotion"}>
              <option value="standalone">Servicio suelto</option>
              <option value="promotion">Promoción</option>
            </select>
          </label>

          <label className="adm-field">
            <span>Etiqueta destacada</span>
            <input name="badge" defaultValue={service?.badge ?? ""} placeholder="Popular, Nuevo…" />
          </label>

          <label className="adm-field adm-field--full">
            <span>Frase corta</span>
            <input
              name="tagline"
              defaultValue={service?.tagline ?? ""}
              placeholder="Se muestra bajo el título en el mosaico de la home"
            />
          </label>

          <label className="adm-field adm-field--full">
            <span>Descripción</span>
            <textarea name="description" rows={4} defaultValue={service?.description ?? ""} />
          </label>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-card__title">Precio</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Importe</span>
            <input
              name="priceAmount"
              defaultValue={service?.price.amount ?? ""}
              placeholder="180 o 180.50"
              required
            />
            {errors.priceAmount && (
              <span className="adm-hint adm-hint--error">{errors.priceAmount}</span>
            )}
          </label>

          <label className="adm-field">
            <span>Moneda</span>
            <select name="currency" defaultValue={service?.price.currency ?? "EUR"}>
              <option value="EUR">Euros (€)</option>
              <option value="USD">Dólares ($)</option>
            </select>
          </label>

          <label className="adm-field">
            <span>Nº de personas</span>
            <input type="number" name="people" min={1} max={10} defaultValue={service?.people ?? 1} />
            <span className="adm-hint">Cuántos vuelan, y por tanto cuántos asistentes se piden.</span>
          </label>

          <label className="adm-field">
            <span>Plazas que ocupa</span>
            <input
              type="number"
              name="seatsPerBooking"
              min={1}
              max={20}
              defaultValue={service?.seatsPerBookingRaw ?? ""}
              placeholder={String(service?.seatsPerBooking ?? 1)}
            />
            <span className="adm-hint">
              Cuánto cupo descuenta del horario. Vacío = igual que el nº de personas.
            </span>
          </label>

          <label className="adm-field">
            <span>Nota de precio</span>
            <input
              name="priceNote"
              defaultValue={service?.priceNoteRaw ?? ""}
              placeholder={service?.priceNote ?? "Vacío = se calcula sola"}
            />
          </label>

          <label className="adm-field">
            <span>Duración (min)</span>
            <input
              type="number"
              name="durationMinutes"
              min={0}
              defaultValue={service?.durationMinutes ?? ""}
            />
          </label>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-card__title">Imágenes</h2>
        <div className="adm-grid">
          <ImageField
            label="Foto de la tarjeta"
            name="image"
            initial={service?.image ?? null}
            folder="services"
          />
          <ImageField
            label="Flyer de la promoción"
            name="flyer"
            initial={service?.flyer ?? null}
            folder="flyers"
          />
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card__head">
          <h2 className="adm-card__title">Qué incluye</h2>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={addRow}>
            Añadir elemento
          </button>
        </div>

        {errors.inclusions && <p className="adm-alert adm-alert--error">{errors.inclusions}</p>}

        {rows.length === 0 ? (
          <p className="adm-empty">
            Sin elementos. Añade los del catálogo y, si hace falta, cámbiales el texto.
          </p>
        ) : (
          <ul className="adm-incl">
            {rows.map((row, index) => {
              const item = items.find((i) => i.id === row.itemId);

              return (
                <li key={row.key} className="adm-incl__row">
                  <span className="adm-incl__icon">
                    <InclusionIcon name={item?.icon ?? "check"} />
                  </span>

                  <select
                    name="inclusionItemId"
                    value={row.itemId}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, n) =>
                          n === index ? { ...r, itemId: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.defaultLabel}
                      </option>
                    ))}
                  </select>

                  <input
                    name="inclusionLabel"
                    value={row.labelOverride}
                    placeholder={item?.defaultLabel ?? "Texto a medida (opcional)"}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, n) =>
                          n === index ? { ...r, labelOverride: e.target.value } : r,
                        ),
                      )
                    }
                  />

                  <div className="adm-incl__tools">
                    <button
                      type="button"
                      aria-label="Subir"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Bajar"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label="Quitar"
                      className="adm-incl__remove"
                      onClick={() => setRows((prev) => prev.filter((_, n) => n !== index))}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card__head">
          <h2 className="adm-card__title">Localidades</h2>
          <Link href="/admin/localidades" className="adm-btn adm-btn--ghost">
            Gestionar zonas
          </Link>
        </div>

        <p className="adm-hint">Zonas donde se ofrece este servicio. Puedes marcar varias.</p>

        {errors.locationIds && <p className="adm-alert adm-alert--error">{errors.locationIds}</p>}

        {locations.length === 0 ? (
          <p className="adm-empty">No hay localidades todavía. Créalas en «Gestionar zonas».</p>
        ) : (
          <ul className="adm-extras">
            {locations.map((loc) => (
              <li key={loc.id}>
                <label className="adm-extra">
                  <input
                    type="checkbox"
                    name="locationId"
                    value={loc.id}
                    defaultChecked={localidadesSeleccionadas.has(loc.id)}
                  />
                  <span className="adm-extra__icon">
                    <InclusionIcon name="mountain" />
                  </span>
                  <span className="adm-extra__name">{loc.name}</span>
                  <span className="adm-extra__price">{loc.region ?? ""}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card__head">
          <h2 className="adm-card__title">Extras de pago</h2>
          <Link href="/admin/extras" className="adm-btn adm-btn--ghost">
            Gestionar catálogo
          </Link>
        </div>

        <p className="adm-hint">
          Extras que el cliente puede añadir por persona (p. ej. paseo a caballo). El precio se cobra
          por cada pasajero que lo elige.
        </p>

        {errors.extras && <p className="adm-alert adm-alert--error">{errors.extras}</p>}

        {extras.length === 0 ? (
          <p className="adm-empty">
            No hay extras en el catálogo todavía. Créalos en «Gestionar catálogo».
          </p>
        ) : (
          <ul className="adm-extras">
            {extras.map((ex) => (
              <li key={ex.id}>
                <label className="adm-extra">
                  <input
                    type="checkbox"
                    name="extraId"
                    value={ex.id}
                    defaultChecked={extrasSeleccionados.has(ex.id)}
                  />
                  <span className="adm-extra__icon">
                    <InclusionIcon name={ex.icon} />
                  </span>
                  <span className="adm-extra__name">{ex.name}</span>
                  <span className="adm-extra__price">{ex.price.display}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="adm-card">
        <h2 className="adm-card__title">Publicación</h2>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Orden</span>
            <input type="number" name="position" defaultValue={service?.position ?? 0} />
          </label>
          <label className="adm-field adm-field--check">
            <input type="checkbox" name="isActive" defaultChecked={service?.isActive ?? true} />
            <span>Visible en la web</span>
          </label>
          <label className="adm-field adm-field--check">
            <input
              type="checkbox"
              name="showOnHome"
              defaultChecked={service?.showOnHome ?? true}
            />
            <span>Mostrar en la portada</span>
          </label>
        </div>
      </section>

      <div className="adm-actions">
        <SubmitButton />
        <Link href="/admin" className="adm-btn adm-btn--ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
