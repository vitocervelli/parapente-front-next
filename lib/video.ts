// Solo navegador: recodifica vídeos antes de subirlos. No importar desde servidor.
//
// El servidor de producción no tiene ffmpeg, así que el vídeo se optimiza aquí,
// en el dispositivo de quien lo sube, con WebCodecs (codificador por hardware
// del móvil/ordenador) a través de Mediabunny. La librería se carga solo cuando
// hay un vídeo que procesar, para no engordar la página.

/** Lado mayor máximo: 1280 px (720p) es de sobra para ver una muestra. */
const MAX_SIDE = 1280;
/** Los vídeos a 60 fps se bajan a 30: se ven igual de bien y pesan la mitad. */
const MAX_FPS = 30;
/** Un MP4 pequeño que ya cabe en 720p no merece el tiempo de recodificarlo. */
const SKIP_UNDER_BYTES = 12 * 1024 * 1024;

/** Dimensión par (H.264 la exige) y nunca por debajo de 2 px. */
const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Devuelve el vídeo optimizado (MP4 H.264 + AAC, máx. 1280 px y 30 fps) o el
 * original si el navegador no sabe recodificar, si no hace falta o si el
 * resultado no pesa menos. Nunca lanza: optimizar no debe impedir subir.
 *
 * `onProgress` recibe un valor entre 0 y 1.
 */
export async function optimizeVideo(file: File, onProgress?: (p: number) => void): Promise<File> {
  if (typeof window === "undefined" || !("VideoEncoder" in window)) return file;

  try {
    const mb = await import("mediabunny");

    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const video = await input.getPrimaryVideoTrack();
    if (!video) return file;

    const w = video.displayWidth;
    const h = video.displayHeight;
    const escala = Math.min(1, MAX_SIDE / Math.max(w, h));
    const width = par(w * escala);
    const height = par(h * escala);

    const fps = (await video.computePacketStats(120)).averagePacketRate;
    const bajarFps = fps > MAX_FPS + 1;

    if (file.type === "video/mp4" && file.size <= SKIP_UNDER_BYTES && escala === 1 && !bajarFps) {
      return file;
    }

    if (!(await mb.canEncodeVideo("avc", { width, height }))) return file;

    // Si tiene sonido y no se puede codificar en AAC, mejor subir el original
    // que entregar un vídeo mudo.
    const audio = await input.getPrimaryAudioTrack();
    if (audio && !(await mb.canEncodeAudio("aac"))) return file;

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new mb.BufferTarget(),
    });

    const conversion = await mb.Conversion.init({
      input,
      output,
      video: {
        width,
        height,
        fit: "contain",
        codec: "avc",
        quality: mb.QUALITY_MEDIUM,
        ...(bajarFps ? { frameRate: MAX_FPS } : {}),
      },
      audio: { codec: "aac", quality: mb.QUALITY_MEDIUM },
      showWarnings: false,
    });

    if (!conversion.isValid) return file;

    conversion.onProgress = (p) => onProgress?.(Math.min(1, Math.max(0, p)));
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength >= file.size) return file;

    return new File([buffer], file.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });
  } catch {
    // Formato que el navegador no sabe leer, falta de memoria…: se sube el original.
    return file;
  }
}
