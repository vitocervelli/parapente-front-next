"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteReelAction,
  reorderReelsAction,
  saveReelAction,
  uploadImageAction,
  type FormState,
} from "../actions";
import { MoveButtons, SortableList } from "../SortableList";
import type { AdminReel } from "@/lib/admin-api";
import { BACKEND_URL } from "@/lib/api";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

function ReelForm({ reel, onDone }: { reel: AdminReel | null; onDone?: () => void }) {
  const action = saveReelAction.bind(null, reel?.id ?? null);
  const [state, formAction] = useActionState<FormState, FormData>(action, null);

  const [videoPath, setVideoPath] = useState(reel?.videoPath ?? "");
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [errorVideo, setErrorVideo] = useState<string | null>(null);

  const [posterPath, setPosterPath] = useState(reel?.posterPath ?? "");
  const [subiendoPoster, setSubiendoPoster] = useState(false);
  const [errorPoster, setErrorPoster] = useState<string | null>(null);

  const errors = state?.errors ?? {};

  async function subirVideo(file: File) {
    setSubiendoVideo(true);
    setErrorVideo(null);

    const data = new FormData();
    data.append("file", file);
    try {
      const res = await fetch("/admin/reels/upload", { method: "POST", body: data });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorVideo(
          (body && typeof body === "object" && "error" in body
            ? (body.error as { message?: string }).message
            : undefined) ?? `El servidor respondió ${res.status}.`,
        );
      } else {
        setVideoPath(body.data.path);
      }
    } catch {
      setErrorVideo("No se pudo subir el vídeo.");
    }
    setSubiendoVideo(false);
  }

  async function subirPoster(file: File) {
    setSubiendoPoster(true);
    setErrorPoster(null);

    const data = new FormData();
    data.append("file", file);
    const result = await uploadImageAction("reels", data);

    if (result.ok) {
      setPosterPath(result.path);
    } else {
      setErrorPoster(result.error);
    }
    setSubiendoPoster(false);
  }

  return (
    <form action={formAction} className="adm-item-form">
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}

      <div className="adm-field">
        <span>Vídeo *</span>
        <input type="hidden" name="videoPath" value={videoPath} />
        <div className="adm-upload">
          {videoPath ? (
            <video className="adm-upload__preview adm-upload__preview--video" src={`${BACKEND_URL}${videoPath}#t=0.1`} muted preload="metadata" />
          ) : (
            <span className="adm-upload__empty">Sin vídeo</span>
          )}
          <div className="adm-upload__controls">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              disabled={subiendoVideo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirVideo(file);
              }}
            />
            {subiendoVideo && <span className="adm-hint">Subiendo vídeo (puede tardar)…</span>}
          </div>
        </div>
        <span className="adm-hint">MP4, MOV o WebM, vertical, hasta 100 MB.</span>
        {errors.videoPath && <span className="adm-hint adm-hint--error">{errors.videoPath}</span>}
        {errorVideo && <span className="adm-hint adm-hint--error">{errorVideo}</span>}
      </div>

      <div className="adm-field">
        <span>Portada (opcional)</span>
        <input type="hidden" name="posterPath" value={posterPath} />
        <div className="adm-upload">
          {posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa directa, sin optimizar
            <img className="adm-upload__preview" src={`${BACKEND_URL}${posterPath}`} alt="Portada del reel" />
          ) : (
            <span className="adm-upload__empty">Primer fotograma</span>
          )}
          <div className="adm-upload__controls">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={subiendoPoster}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirPoster(file);
              }}
            />
            {subiendoPoster && <span className="adm-hint">Subiendo…</span>}
            {posterPath && !subiendoPoster && (
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setPosterPath("")}>
                Quitar portada
              </button>
            )}
          </div>
        </div>
        <span className="adm-hint">Imagen fija antes de que arranque el vídeo. Sin ella se usa el primer fotograma.</span>
        {errorPoster && <span className="adm-hint adm-hint--error">{errorPoster}</span>}
      </div>

      <div className="adm-item-form__grid">
        <label className="adm-field">
          <span>Título (opcional)</span>
          <input name="caption" defaultValue={reel?.caption ?? ""} placeholder="Solo para orientarte en el panel" />
        </label>

        <label className="adm-field adm-field--check">
          <input type="checkbox" name="isActive" defaultChecked={reel?.isActive ?? true} />
          <span>Visible en la portada</span>
        </label>
      </div>

      <div className="adm-actions">
        <SaveButton label={reel ? "Guardar" : "Añadir"} />
        {onDone && (
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function DeleteReelForm({ id }: { id: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(deleteReelAction, null);

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

export function ReelsEditor({ reels }: { reels: AdminReel[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <SortableList
      items={reels}
      action={reorderReelsAction}
      hint="Arrastra las filas por el asa para cambiar el orden de los reels en la portada."
      isStatic={(reel) => editing === reel.id}
      footer={
        adding ? (
          <article className="adm-item">
            <ReelForm reel={null} onDone={() => setAdding(false)} />
          </article>
        ) : (
          <button
            type="button"
            className="adm-btn adm-btn--primary adm-items__add"
            onClick={() => setAdding(true)}
          >
            Añadir reel
          </button>
        )
      }
    >
      {(reel, index, controls) =>
        editing === reel.id ? (
          <ReelForm reel={reel} onDone={() => setEditing(null)} />
        ) : (
          <>
            <span className="adm-item__icon adm-item__icon--foto">
              {reel.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar
                <img src={`${BACKEND_URL}${reel.posterPath}`} alt="" loading="lazy" />
              ) : (
                <video src={`${BACKEND_URL}${reel.videoPath}#t=0.1`} muted preload="metadata" />
              )}
            </span>
            <span className="adm-item__label">
              {reel.caption || `Reel ${index + 1}`}
              {!reel.isActive && <em className="adm-hint"> · oculto</em>}
            </span>
            <div className="adm-item__tools">
              <MoveButtons label={reel.caption || `reel ${index + 1}`} controls={controls} />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setEditing(reel.id)}
              >
                Editar
              </button>
              <DeleteReelForm id={reel.id} />
            </div>
          </>
        )
      }
    </SortableList>
  );
}
