"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MAX_ARCHIVOS = 6;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Icono para lo que no se puede previsualizar en un <img> (PDF). */
function PdfIcon() {
  return (
    <span className="proofs__pdficono" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      PDF
    </span>
  );
}

type Elegido = { id: number; file: File; preview: string | null };

function liberar(e: Elegido): void {
  if (e.preview) URL.revokeObjectURL(e.preview);
}

/**
 * Subida de comprobantes desde el panel: el equipo adjunta lo que el cliente
 * mandó por otra vía. Mismo aspecto y validaciones que la subida del cliente.
 */
export function ProofUploader({ bookingId }: { bookingId: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [elegidos, setElegidos] = useState<Elegido[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
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

    let aceptados = files.filter((f) => TIPOS.includes(f.type));
    if (aceptados.length < files.length) {
      setError("Solo admitimos fotos JPG, PNG o WebP y archivos PDF.");
    }
    if (aceptados.length === 0) return;

    if (aceptados.length > MAX_ARCHIVOS) {
      setError(`Sube como mucho ${MAX_ARCHIVOS} archivos a la vez.`);
      aceptados = aceptados.slice(0, MAX_ARCHIVOS);
    }

    elegidos.forEach(liberar);
    setElegidos(
      aceptados.map((file) => ({
        id: siguienteId.current++,
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    );
  }

  function quitar(id: number) {
    const fuera = elegidos.find((e) => e.id === id);
    if (fuera) liberar(fuera);
    setElegidos(elegidos.filter((e) => e.id !== id));
    setError(null);
  }

  async function subir() {
    if (elegidos.length === 0) return;

    setSubiendo(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const { file } of elegidos) {
        formData.append("files[]", file);
      }

      const res = await fetch(`/admin/reservas/${bookingId}/comprobante`, {
        method: "POST",
        body: formData,
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          body && typeof body === "object" && "error" in body
            ? (body.error as { message?: string }).message
            : undefined;
        setError(message ?? `El servidor respondió ${res.status}.`);
        return;
      }

      elegidos.forEach(liberar);
      setElegidos([]);
      router.refresh();
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="proofs__form">
      <span className="proofs__file-titulo">Añadir comprobante</span>

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
        <strong>Pulsa aquí para elegir el comprobante</strong>
        <span>o arrastra la foto o el PDF hasta este recuadro</span>
        <span className="proofs__zona-formatos">JPG, PNG, WebP o PDF · hasta {MAX_ARCHIVOS} archivos</span>
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
                  <PdfIcon />
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
              : "Subir comprobante"}
        </button>
      </div>
    </div>
  );
}
