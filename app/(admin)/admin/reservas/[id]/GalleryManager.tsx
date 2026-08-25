"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AdminBooking } from "@/lib/admin-api";
import { compressImage } from "@/lib/image";
import { uploadDirect, uploadError } from "@/lib/upload-client";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const TIPOS = [...TIPOS_IMAGEN, ...TIPOS_VIDEO];
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
/** Fotos por request: por debajo del tope de 10 del backend, con margen. */
const FOTOS_POR_LOTE = 8;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Icono de claqueta para los vídeos de la cola (sin generar poster). */
function VideoIcon() {
  return (
    <span className="proofs__pdficono" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="14" height="14" rx="2" />
        <path d="M22 7l-6 5 6 5z" />
      </svg>
      VÍDEO
    </span>
  );
}

type Elegido = { id: number; file: File; preview: string | null };

function liberar(e: Elegido): void {
  if (e.preview) URL.revokeObjectURL(e.preview);
}

/** Comprime las fotos de a pocas para no agotar memoria con 40 capturas de móvil. */
async function comprimirTodas(files: File[], onProgress: (done: number) => void): Promise<File[]> {
  const out: File[] = new Array(files.length);
  let i = 0;
  let done = 0;
  const worker = async () => {
    while (i < files.length) {
      const idx = i++;
      const f = files[idx];
      out[idx] = f.type.startsWith("image/") ? await compressImage(f) : f;
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  return out;
}

/**
 * Galería del vuelo: el equipo sube aquí las fotos y vídeos del evento y el
 * cliente los ve desde su cuenta. Las fotos se comprimen en este navegador
 * antes de viajar (~2000 px, JPEG) y van en tandas; cada vídeo va solo en su
 * propio request porque puede pesar hasta 100 MB.
 */
export function GalleryManager({ booking }: { booking: AdminBooking }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [elegidos, setElegidos] = useState<Elegido[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);
  const siguienteId = useRef(0);

  const vivos = useRef<Elegido[]>([]);
  useEffect(() => {
    vivos.current = elegidos;
  }, [elegidos]);
  useEffect(() => () => vivos.current.forEach(liberar), []);

  function elegir(lista: FileList | null) {
    setError(null);
    const files = Array.from(lista ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;

    const aceptados: File[] = [];
    for (const f of files) {
      if (!TIPOS.includes(f.type)) {
        setError("Solo admitimos fotos JPG, PNG o WebP y vídeos MP4, MOV o WebM.");
        continue;
      }
      if (TIPOS_VIDEO.includes(f.type) && f.size > VIDEO_MAX_BYTES) {
        setError(`"${f.name}" pesa ${formatBytes(f.size)}: los vídeos pueden ocupar hasta 100 MB.`);
        continue;
      }
      aceptados.push(f);
    }
    if (aceptados.length === 0) return;

    // Se AÑADE a la cola (un vuelo puede juntar decenas de fotos elegidas en tandas).
    setElegidos((previos) => [
      ...previos,
      ...aceptados.map((file) => ({
        id: siguienteId.current++,
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
  }

  function quitar(id: number) {
    const fuera = elegidos.find((e) => e.id === id);
    if (fuera) liberar(fuera);
    setElegidos(elegidos.filter((e) => e.id !== id));
    setError(null);
  }

  async function enviarLote(files: File[]): Promise<string | null> {
    const formData = new FormData();
    for (const file of files) formData.append("files[]", file);

    // Directo al backend (sin pasar por Vercel), para admitir vídeos de hasta 100 MB.
    const res = await uploadDirect(`/api/admin/bookings/${booking.id}/media`, formData);
    return res.ok ? null : uploadError(res.body, res.status);
  }

  async function subir() {
    if (elegidos.length === 0) return;

    setSubiendo(true);
    setError(null);

    try {
      const fotos = elegidos.filter((e) => TIPOS_IMAGEN.includes(e.file.type));
      const videos = elegidos.filter((e) => TIPOS_VIDEO.includes(e.file.type));

      setEstado(fotos.length > 0 ? `Comprimiendo fotos (0 de ${fotos.length})…` : null);
      const comprimidas = await comprimirTodas(
        fotos.map((e) => e.file),
        (done) => setEstado(`Comprimiendo fotos (${done} de ${fotos.length})…`),
      );

      // Fotos en tandas secuenciales; los ids subidos se van sacando de la cola
      // para que un fallo a mitad conserve solo lo pendiente.
      const totalLotes = Math.ceil(comprimidas.length / FOTOS_POR_LOTE);
      for (let lote = 0; lote < totalLotes; lote++) {
        setEstado(`Subiendo fotos (lote ${lote + 1} de ${totalLotes})…`);
        const desde = lote * FOTOS_POR_LOTE;
        const tanda = comprimidas.slice(desde, desde + FOTOS_POR_LOTE);
        const fallo = await enviarLote(tanda);
        if (fallo) {
          setError(fallo);
          return;
        }
        const subidos = new Set(fotos.slice(desde, desde + tanda.length).map((e) => e.id));
        setElegidos((prev) =>
          prev.filter((e) => {
            if (subidos.has(e.id)) {
              liberar(e);
              return false;
            }
            return true;
          }),
        );
      }

      // Cada vídeo en su propio request: puede pesar hasta 100 MB.
      for (let i = 0; i < videos.length; i++) {
        setEstado(
          videos.length > 1
            ? `Subiendo vídeo ${i + 1} de ${videos.length} (puede tardar)…`
            : "Subiendo el vídeo (puede tardar)…",
        );
        const fallo = await enviarLote([videos[i].file]);
        if (fallo) {
          setError(fallo);
          return;
        }
        const id = videos[i].id;
        setElegidos((prev) =>
          prev.filter((e) => {
            if (e.id === id) {
              liberar(e);
              return false;
            }
            return true;
          }),
        );
      }

      router.refresh();
    } finally {
      setSubiendo(false);
      setEstado(null);
    }
  }

  async function borrar(mediaId: number) {
    if (!window.confirm("¿Borrar este archivo de la galería? El cliente dejará de verlo.")) return;

    setBorrando(mediaId);
    setError(null);
    try {
      const res = await fetch(`/admin/reservas/${booking.id}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("No se pudo borrar el archivo.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setBorrando(null);
    }
  }

  return (
    <section className="adm-card">
      <h2 className="adm-card__title">Galería del vuelo</h2>
      <p className="adm-hint">
        Fotos y vídeos del evento; el cliente los ve en su cuenta, en el detalle de esta reserva.
        Las fotos se comprimen solas antes de subir.
      </p>

      {booking.media.length > 0 && (
        <div className="mediag__grid">
          {booking.media.map((m) => {
            const src = `/admin/reservas/${booking.id}/media/${m.id}`;
            return (
              <div key={m.id} className="mediag__item">
                <a href={src} target="_blank" rel="noopener" title={m.originalName}>
                  {m.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- media autenticada vía proxy, next/image no aplica
                    <img src={src} alt={m.originalName} loading="lazy" />
                  ) : (
                    <>
                      {/* #t=0.1: el navegador pinta el primer fotograma como previsualización */}
                      <video src={`${src}#t=0.1`} preload="metadata" muted />
                      <span className="mediag__play" aria-hidden="true">▶</span>
                    </>
                  )}
                </a>
                <a
                  className="mediag__descarga mediag__descarga--izq"
                  href={`${src}?download=1`}
                  download
                  title="Descargar"
                  aria-label={`Descargar ${m.originalName}`}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                </a>
                <button
                  type="button"
                  className="mediag__borrar"
                  disabled={borrando === m.id || subiendo}
                  aria-label={`Borrar ${m.originalName}`}
                  title="Borrar"
                  onClick={() => borrar(m.id)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <label
        className={`proofs__zona${encima ? " proofs__zona--encima" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          elegir(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={TIPOS.join(",")}
          className="proofs__zona-input"
          onChange={(e) => elegir(e.target.files)}
        />
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v13" />
        </svg>
        <strong>Pulsa aquí para elegir fotos o vídeos</strong>
        <span>o arrástralos hasta este recuadro (puedes añadir en varias tandas)</span>
        <span className="proofs__zona-formatos">JPG, PNG, WebP · MP4, MOV, WebM hasta 100 MB</span>
      </label>

      {elegidos.length > 0 && (
        <ul className="proofs__elegidos">
          {elegidos.map(({ id, file, preview }) => (
            <li key={id} className="proofs__elegido">
              <span className="proofs__elegido-mini">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- object URL local, next/image no lo optimiza
                  <img src={preview} alt={`Vista previa de ${file.name}`} />
                ) : (
                  <VideoIcon />
                )}
              </span>
              <span className="proofs__elegido-datos">
                <strong>{file.name}</strong>
                <span>{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                className="proofs__quitar"
                disabled={subiendo}
                aria-label={`Quitar ${file.name}`}
                title="Quitar"
                onClick={() => quitar(id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {estado && <p className="mediag__estado">{estado}</p>}
      {error && <p className="adm-alert adm-alert--error">{error}</p>}

      <div className="adm-actions">
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          disabled={subiendo || elegidos.length === 0}
          onClick={subir}
        >
          {subiendo
            ? "Subiendo…"
            : elegidos.length > 1
              ? `Subir ${elegidos.length} archivos`
              : "Subir a la galería"}
        </button>
      </div>
    </section>
  );
}
