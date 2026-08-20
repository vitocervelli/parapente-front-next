"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ds/Button";
import type { Booking, Proof } from "@/lib/account-api";
import { compressImage } from "@/lib/image";

const TONO: Record<Proof["status"], string> = {
  pending: "res-estado--espera",
  accepted: "res-estado--ok",
  rejected: "res-estado--no",
};

const MAX_ARCHIVOS = 6;

const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Reduce una foto grande antes de subirla (los PDF van tal cual). La lógica
 * vive en lib/image.ts, compartida con la galería del panel.
 */
function compressIfImage(file: File): Promise<File> {
  return compressImage(file, { quality: 0.85 });
}

/** Lo que no se puede previsualizar en un <img>: icono de documento y etiqueta. */
function IconoArchivo({ etiqueta }: { etiqueta: string }) {
  return (
    <span className="proofs__pdficono" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      {etiqueta}
    </span>
  );
}

/** Un archivo aún sin subir, con su miniatura si es una imagen. */
type Elegido = { id: number; file: File; preview: string | null; rota?: boolean };

function liberar(elegido: Elegido): void {
  if (elegido.preview) URL.revokeObjectURL(elegido.preview);
}

export function ProofPanel({ booking }: { booking: Booking }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [elegidos, setElegidos] = useState<Elegido[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Solo para pintar la zona resaltada mientras se arrastra algo encima. */
  const [encima, setEncima] = useState(false);

  /** Clave local de cada archivo elegido: dos fotos pueden llamarse igual. */
  const siguienteId = useRef(0);

  // Las miniaturas son object URLs y hay que devolverlas a mano: si el usuario
  // se va de la página sin subir nada, se quedarían en memoria del navegador.
  const vivos = useRef<Elegido[]>([]);
  useEffect(() => {
    vivos.current = elegidos;
  }, [elegidos]);
  useEffect(() => () => vivos.current.forEach(liberar), []);

  const puedeSubir = booking.isLive;

  function elegir(lista: FileList | null) {
    setError(null);
    const files = Array.from(lista ?? []);

    // El input se vacía en cuanto se lee: así se puede volver a elegir el
    // mismo archivo después de quitarlo, que si no el `change` no salta.
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;

    // Al soltar archivos encima, el `accept` del input no filtra nada: hay que
    // comprobar el tipo aquí o se sube un .docx que el backend rechaza.
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
    if (elegidos.length === 0) {
      setError("Elige al menos una foto o un PDF.");
      return;
    }

    setSubiendo(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const { file } of elegidos) {
        formData.append("files[]", await compressIfImage(file));
      }

      const res = await fetch(`/cuenta/reservas/${booking.reference}/comprobante`, {
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

      if (fileRef.current) fileRef.current.value = "";
      elegidos.forEach(liberar);
      setElegidos([]);
      router.refresh();
    } finally {
      setSubiendo(false);
    }
  }

  const parcial = Number(booking.paid.amount) > 0 && !booking.isFullyPaid;

  return (
    <section className="proofs">
      <h2 className="res-detalle__titulo">Comprobantes de pago</h2>

      {parcial && (
        <p className="proofs__saldo">
          Tenemos registrado <strong>{booking.paid.display}</strong> de{" "}
          {booking.total.display}. Queda pendiente <strong>{booking.outstanding.display}</strong>.
        </p>
      )}

      {puedeSubir && (
        <div className="proofs__form">
          <p className="proofs__intro">
            Sube la foto del comprobante de la transferencia. Si pagaste en varias veces, puedes
            subir varias — nosotros comprobamos los importes.
          </p>

          <div className="proofs__file">
            <span className="proofs__file-titulo">Fotos o PDF del comprobante</span>

            {/* El input tapa toda la caja: así se pulse donde se pulse dentro
                del recuadro se abre el selector de archivos. */}
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

              <svg
                viewBox="0 0 24 24"
                width="30"
                height="30"
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

              <strong>Pulsa aquí para elegir el comprobante</strong>
              <span>o arrastra la foto o el PDF hasta este recuadro</span>
              <span className="proofs__zona-formatos">
                JPG, PNG, WebP o PDF · hasta {MAX_ARCHIVOS} archivos
              </span>
            </label>
          </div>

          {elegidos.length > 0 && (
            <ul className="proofs__elegidos">
              {elegidos.map(({ id, file, preview, rota }) => (
                <li key={id} className="proofs__elegido">
                  <span className="proofs__elegido-mini">
                    {preview && !rota ? (
                      // eslint-disable-next-line @next/next/no-img-element -- es un object URL del archivo local, next/image no lo puede optimizar
                      <img
                        src={preview}
                        alt={`Vista previa de ${file.name}`}
                        // Una foto que el navegador no sabe abrir dejaría el
                        // hueco roto; mejor el icono genérico.
                        onError={() =>
                          setElegidos((prev) =>
                            prev.map((e) => (e.id === id ? { ...e, rota: true } : e)),
                          )
                        }
                      />
                    ) : (
                      <IconoArchivo etiqueta={preview ? "IMG" : "PDF"} />
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

          {error && <p className="acceso__error">{error}</p>}

          <Button size="md" disabled={subiendo || elegidos.length === 0} onClick={subir}>
            {subiendo
              ? "Subiendo…"
              : elegidos.length > 1
                ? `Subir ${elegidos.length} archivos`
                : "Subir comprobante"}
          </Button>
        </div>
      )}

      {booking.proofs.length > 0 && (
        <ul className="proofs__lista">
          {booking.proofs.map((p) => (
            <li key={p.id} className="proofs__item">
              <a
                href={`/cuenta/reservas/${booking.reference}/comprobante/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="proofs__mini"
              >
                {p.mimeType === "application/pdf" ? (
                  <span className="proofs__pdf">PDF</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- viene por el proxy autenticado, next/image no puede optimizarla
                  <img src={`/cuenta/reservas/${booking.reference}/comprobante/${p.id}`} alt="" />
                )}
              </a>

              <div className="proofs__info">
                <span className={`res-estado ${TONO[p.status]}`}>{p.statusLabel}</span>
                <span className="proofs__meta">
                  {new Date(p.uploadedAt).toLocaleDateString("es-ES")} · {formatBytes(p.sizeBytes)}
                </span>
                {/* El importe lo registra el equipo al revisarlo. */}
                {p.declaredAmount && (
                  <span className="proofs__importe">
                    Verificado: {p.declaredAmount}
                    {p.transferReference ? ` · ref. ${p.transferReference}` : ""}
                  </span>
                )}
                {p.status === "rejected" && p.reviewNote && (
                  <span className="proofs__motivo">Motivo: {p.reviewNote}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!puedeSubir && booking.proofs.length === 0 && (
        <p className="cuenta__sub">Esta reserva no tiene comprobantes.</p>
      )}
    </section>
  );
}
