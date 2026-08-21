import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

/**
 * Favicon: el logotipo de la marca (parapente sobre las montañas, en blanco)
 * centrado sobre el mismo cuadro azul redondeado que ya usábamos. Se genera a
 * partir de `brand-mark.png`, empaquetado junto a este archivo.
 */
export const size = { width: 128, height: 128 };
export const contentType = "image/png";

export default async function Icon() {
  const mark = await readFile(new URL("./brand-mark.png", import.meta.url));
  const src = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#004aad",
          borderRadius: 28,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={104} height={63} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  );
}
