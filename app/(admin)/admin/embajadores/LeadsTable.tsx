"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteInfluencerLeadAction, updateInfluencerLeadAction } from "../actions";
import type { InfluencerLead } from "@/lib/admin-api";
import {
  COLABORACIONES,
  ESTADOS_LEAD,
  NICHOS,
  REDES,
  etiqueta,
  formatSeguidores,
} from "@/lib/embajadores";
import { coincide, pajar } from "@/lib/search";

function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function estadoDe(key: string) {
  return ESTADOS_LEAD.find((e) => e.key === key) ?? ESTADOS_LEAD[0];
}

/** Enlace a un perfil con la red y los seguidores, p. ej. «Instagram · 12,5 mil». */
function RedLink({ social }: { social: InfluencerLead["socials"][number] }) {
  const seguidores = formatSeguidores(social.followers);
  return (
    <a
      className="lead-red"
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      title={social.url}
    >
      {etiqueta(REDES, social.network)}
      {seguidores && <span className="lead-red__n"> · {seguidores}</span>}
    </a>
  );
}

/** Ficha desplegada: todos los datos + estado y nota interna editables. */
function Ficha({ lead, onBorrar }: { lead: InfluencerLead; onBorrar: () => void }) {
  const [status, setStatus] = useState(lead.status);
  const [nota, setNota] = useState(lead.adminNote ?? "");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const cambiado = status !== lead.status || nota !== (lead.adminNote ?? "");

  function guardar() {
    setAviso(null);
    startTransition(async () => {
      const result = await updateInfluencerLeadAction(lead.id, { status, adminNote: nota });
      setAviso(
        result.ok
          ? { ok: true, texto: "Guardado." }
          : { ok: false, texto: result.message ?? "No se pudo guardar." },
      );
    });
  }

  const ubicacion = [lead.city, lead.country].filter(Boolean).join(", ");

  return (
    <div className="lead-ficha">
      <dl className="lead-ficha__datos">
        <div>
          <dt>Correo</dt>
          <dd>
            <a href={`mailto:${lead.email}`}>{lead.email}</a>
          </dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>
            <a href={`tel:${lead.phone.replace(/\s+/g, "")}`}>{lead.phone}</a>
          </dd>
        </div>
        <div>
          <dt>Edad</dt>
          <dd>{lead.age} años</dd>
        </div>
        <div>
          <dt>Ubicación</dt>
          <dd>{ubicacion || "—"}</dd>
        </div>
        <div>
          <dt>Nicho</dt>
          <dd>
            {lead.niches.length ? lead.niches.map((k) => etiqueta(NICHOS, k)).join(", ") : "—"}
          </dd>
        </div>
        <div>
          <dt>Colaboración</dt>
          <dd>
            {lead.collaborationTypes.length
              ? lead.collaborationTypes.map((k) => etiqueta(COLABORACIONES, k)).join(", ")
              : "—"}
          </dd>
        </div>
        <div className="lead-ficha__ancho">
          <dt>Redes</dt>
          <dd>
            <ul className="lead-ficha__redes">
              {lead.socials.map((s, i) => (
                <li key={i}>
                  <strong>{etiqueta(REDES, s.network)}</strong>{" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.url}
                  </a>
                  {s.followers !== null && (
                    <span> · {s.followers.toLocaleString("es-ES")} seguidores</span>
                  )}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="lead-ficha__ancho">
          <dt>Comentarios</dt>
          <dd className="lead-ficha__texto">{lead.comments || "—"}</dd>
        </div>
      </dl>

      <div className="lead-ficha__gestion">
        <label className="adm-field">
          <span>Estado</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InfluencerLead["status"])}
          >
            {ESTADOS_LEAD.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>Nota interna</span>
          <textarea
            rows={3}
            value={nota}
            placeholder="Solo la ve el equipo: cuándo le escribiste, qué acordasteis…"
            onChange={(e) => setNota(e.target.value)}
          />
        </label>
        <div className="adm-actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={!cambiado || pending}
            onClick={guardar}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" className="adm-btn adm-btn--danger" onClick={onBorrar}>
            Borrar solicitud
          </button>
          {aviso && (
            <span className={aviso.ok ? "adm-hint" : "adm-hint adm-hint--error"} role="status">
              {aviso.texto}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Listado de solicitudes de embajadores: buscador instantáneo, filtro por
 * estado y ficha desplegable con la gestión de cada una.
 */
export function LeadsTable({ leads }: { leads: InfluencerLead[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<string>("todas");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [borrando, setBorrando] = useState<InfluencerLead | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const [pendingBorrar, startBorrar] = useTransition();

  const pajares = useMemo(
    () =>
      new Map(
        leads.map((l) => [
          l.id,
          pajar([
            l.firstName,
            l.lastName,
            l.email,
            l.phone,
            l.city,
            l.country,
            ...l.socials.map((s) => `${etiqueta(REDES, s.network)} ${s.url}`),
            ...l.niches.map((k) => etiqueta(NICHOS, k)),
          ]),
        ]),
      ),
    [leads],
  );

  const conteo = useMemo(() => {
    const c: Record<string, number> = { todas: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const visibles = leads.filter(
    (l) =>
      (filtro === "todas" || l.status === filtro) &&
      (!busqueda.trim() || coincide(pajares.get(l.id) ?? "", busqueda)),
  );

  function confirmarBorrado() {
    if (!borrando) return;
    setErrorBorrar(null);
    startBorrar(async () => {
      const result = await deleteInfluencerLeadAction(borrando.id);
      if (result.ok) {
        setBorrando(null);
        setAbierta(null);
      } else {
        setErrorBorrar(result.message ?? "No se pudo borrar.");
      }
    });
  }

  return (
    <>
      <div className="res-buscador">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo, teléfono, ciudad o red…"
          aria-label="Buscar solicitudes"
        />
        {busqueda && (
          <span className="res-buscador__conteo">
            {visibles.length} de {leads.length}
          </span>
        )}
      </div>

      <div className="adm-filtros">
        {[{ key: "todas", label: "Todas" }, ...ESTADOS_LEAD].map((e) => (
          <button
            key={e.key}
            type="button"
            className={`adm-chip${filtro === e.key ? " adm-chip--on" : ""}`}
            onClick={() => setFiltro(e.key)}
          >
            {e.label} ({conteo[e.key] ?? 0})
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="adm-empty">
          {leads.length === 0
            ? "Aún no ha llegado ninguna solicitud. Comparte el enlace /embajadores para empezar a recibirlas."
            : "Ninguna solicitud coincide con la búsqueda o el filtro."}
        </p>
      ) : (
        <div className="adm-table">
          {visibles.map((l) => {
            const estado = estadoDe(l.status);
            const abiertaEsta = abierta === l.id;
            const ubicacion = [l.city, l.country].filter(Boolean).join(", ");
            return (
              <article
                key={l.id}
                className={`adm-row adm-row--lead${abiertaEsta ? " adm-row--open" : ""}`}
              >
                <div className="adm-row__main">
                  <span className="adm-row__titulo">
                    <button
                      type="button"
                      className="adm-row__name lead-nombre"
                      aria-expanded={abiertaEsta}
                      onClick={() => setAbierta(abiertaEsta ? null : l.id)}
                    >
                      {l.firstName} {l.lastName}
                    </button>
                    <span className="adm-row__personas">{l.age} años</span>
                  </span>
                  <span className="adm-row__meta">
                    {l.email} · {l.phone}
                    {ubicacion ? ` · ${ubicacion}` : ""}
                  </span>
                </div>

                <div className="lead-redes">
                  {l.socials.map((s, i) => (
                    <RedLink key={i} social={s} />
                  ))}
                </div>

                <span className="adm-row__estados">
                  <span className={`res-estado ${estado.tono}`}>{estado.label}</span>
                </span>
                <span className="lead-fecha">{formatFecha(l.createdAt)}</span>

                <div className="adm-row__actions">
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    aria-expanded={abiertaEsta}
                    onClick={() => setAbierta(abiertaEsta ? null : l.id)}
                  >
                    {abiertaEsta ? "Cerrar" : "Ver ficha"}
                  </button>
                </div>

                {/* Sin remontar al refrescar: así el aviso «Guardado.» sigue visible
                    y el botón vuelve a deshabilitarse al coincidir con lo guardado. */}
                {abiertaEsta && <Ficha key={l.id} lead={l} onBorrar={() => setBorrando(l)} />}
              </article>
            );
          })}
        </div>
      )}

      {borrando && (
        <div
          className="adm-modal__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-lead-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBorrando(null);
          }}
        >
          <div className="adm-modal">
            <h3 id="del-lead-title" className="adm-modal__title">
              ¿Borrar la solicitud de {borrando.firstName} {borrando.lastName}?
            </h3>
            <p className="adm-modal__text">
              Se eliminarán sus datos, redes y la nota interna. No se puede deshacer. Si solo no te
              interesa, mejor márcala como «Descartada».
            </p>
            {errorBorrar && <p className="adm-hint adm-hint--error">{errorBorrar}</p>}
            <div className="adm-modal__actions">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setBorrando(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--danger"
                disabled={pendingBorrar}
                onClick={confirmarBorrado}
              >
                {pendingBorrar ? "Borrando…" : "Sí, borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
