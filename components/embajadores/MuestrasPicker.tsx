"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_ARCHIVOS,
  MAX_FOTO_ORIGINAL_BYTES,
  MAX_VIDEO_ORIGINAL_BYTES,
  TIPOS_FOTO,
  TIPOS_VIDEO,
  formatBytes,
} from "@/lib/embajadores";

export type Muestra = {
  id: number;
  file: File;
  kind: "image" | "video";
  /** Object URL para la miniatura (solo formatos que el navegador sabe pintar). */
  preview: string | null;
};

const EXT_FOTO = /\.(jpe?g|png|webp|heic|heif)$/i;
const EXT_VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const PINTABLES = ["image/jpeg", "image/png", "image/webp"];

/** Algunos navegadores no dan MIME para .mov o .heic: se mira también la extensión. */
function tipoDe(file: File): "image" | "video" | null {
  if (TIPOS_FOTO.includes(file.type) || (!file.type && EXT_FOTO.test(file.name))) return "image";
  if (TIPOS_VIDEO.includes(file.type) || (!file.type && EXT_VIDEO.test(file.name))) return "video";
  if (file.type.startsWith("video/") && EXT_VIDEO.test(file.name)) return "video";
  return null;
}

function VideoIcon() {
  return (
    <span className="proofs__pdficono" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="5" width="14" height="14" rx="2" />
        <path d="M22 7l-6 5 6 5z" />
      </svg>
      VÍDEO
    </span>
  );
}

function FotoIcon() {
  return (
    <span className="proofs__pdficono" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 17l-5-5-9 8" />
      </svg>
      FOTO
    </span>
  );
}

/**
 * Zona para elegir fotos y vídeos de muestra (opcional). Solo selecciona y
 * valida; la optimización y la subida las hace el formulario al enviar.
 */
export function MuestrasPicker({
  muestras,
  onChange,
  disabled,
}: {
  muestras: Muestra[];
  onChange: (muestras: Muestra[]) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const siguienteId = useRef(1);
  const [encima, setEncima] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Libera las miniaturas al desmontar (evita fugas de memoria con fotos grandes).
  const vivas = useRef<Muestra[]>(muestras);
  useEffect(() => {
    vivas.current = muestras;
  }, [muestras]);
  useEffect(
    () => () => vivas.current.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)),
    [],
  );

  function elegir(lista: FileList | null) {
    const files = Array.from(lista ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;

    const avisos: string[] = [];
    const nuevas: Muestra[] = [];
    let libres = MAX_ARCHIVOS - muestras.length;

    for (const file of files) {
      const kind = tipoDe(file);
      if (!kind) {
        avisos.push(`«${file.name}» no es una foto ni un vídeo compatible.`);
        continue;
      }
      const max = kind === "video" ? MAX_VIDEO_ORIGINAL_BYTES : MAX_FOTO_ORIGINAL_BYTES;
      if (file.size > max) {
        avisos.push(
          `«${file.name}» pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(max)}.`,
        );
        continue;
      }
      if (libres <= 0) {
        avisos.push(`Puedes añadir como mucho ${MAX_ARCHIVOS} archivos.`);
        break;
      }
      libres--;
      nuevas.push({
        id: siguienteId.current++,
        file,
        kind,
        preview:
          kind === "image" && PINTABLES.includes(file.type) ? URL.createObjectURL(file) : null,
      });
    }

    setAviso(avisos.length ? avisos.join(" ") : null);
    if (nuevas.length) onChange([...muestras, ...nuevas]);
  }

  function quitar(id: number) {
    const fuera = muestras.find((m) => m.id === id);
    if (fuera?.preview) URL.revokeObjectURL(fuera.preview);
    onChange(muestras.filter((m) => m.id !== id));
    setAviso(null);
  }

  return (
    <div className="emb-grupo">
      {muestras.length < MAX_ARCHIVOS && (
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
            if (!disabled) elegir(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="proofs__zona-input"
            disabled={disabled}
            onChange={(e) => elegir(e.target.files)}
          />
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v13" />
          </svg>
          <strong>Pulsa para elegir fotos o vídeos</strong>
          <span>o arrástralos aquí · hasta {MAX_ARCHIVOS} archivos</span>
          <span className="proofs__zona-formatos">
            Los optimizamos en tu dispositivo antes de subirlos, así tardan menos.
          </span>
        </label>
      )}

      {aviso && <p className="emb-error">{aviso}</p>}

      {muestras.length > 0 && (
        <ul className="proofs__elegidos">
          {muestras.map((m) => (
            <li key={m.id} className="proofs__elegido">
              <span className="proofs__elegido-mini">
                {m.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- object URL local, next/image no lo optimiza
                  <img src={m.preview} alt={`Vista previa de ${m.file.name}`} />
                ) : m.kind === "video" ? (
                  <VideoIcon />
                ) : (
                  <FotoIcon />
                )}
              </span>
              <span className="proofs__elegido-datos">
                <strong>{m.file.name}</strong>
                <span>
                  {m.kind === "video" ? "Vídeo" : "Foto"} · {formatBytes(m.file.size)}
                </span>
              </span>
              <button
                type="button"
                className="proofs__quitar"
                disabled={disabled}
                aria-label={`Quitar ${m.file.name}`}
                title="Quitar"
                onClick={() => quitar(m.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
