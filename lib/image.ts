// Solo navegador: usa canvas. No importar desde código de servidor.

type CompressOptions = {
  /** Lado máximo en píxeles; por encima se reduce a escala. */
  maxDimension?: number;
  /** Calidad JPEG (0–1). */
  quality?: number;
  /** Por debajo de este peso no merece la pena tocar el archivo. */
  skipUnderBytes?: number;
};

/**
 * Reduce una foto grande antes de subirla: una captura de móvil pesa varios MB
 * y para verla en pantalla sobran ~2000 px de lado. Al recomprimir a JPEG se
 * pierden además los metadatos EXIF/GPS — mejor para la privacidad.
 *
 * Devuelve el archivo original si no es una imagen, si ya es pequeño, si el
 * resultado no reduce el peso, o si el navegador no sabe decodificarlo.
 */
export async function compressImage(
  file: File,
  { maxDimension = 2000, quality = 0.8, skipUnderBytes = 1_000_000 }: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < skipUnderBytes) return file;

  try {
    // imageOrientation respeta el EXIF: las fotos de móvil no salen giradas.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Formato que el navegador no sabe decodificar: se sube el original.
    return file;
  }
}
