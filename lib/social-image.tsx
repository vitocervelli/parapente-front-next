import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

/**
 * Tarjeta que se ve al compartir la web por WhatsApp, Facebook, X, Telegram,
 * LinkedIn, iMessage, etc. La generan las convenciones `opengraph-image` y
 * `twitter-image` de Next; ambas la reutilizan desde aquí para no duplicarla.
 *
 * Es una foto real de vuelo (IMG_4752) a 1200×630 —la proporción que piden las
 * redes para la tarjeta grande— con un degradado inferior y el nombre de marca.
 * La foto se empaqueta con el propio código (import.meta.url) para no depender
 * de que el backend esté disponible al generar la imagen.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Parapente Bella Vista — vuelo tándem en parapente sobre el valle";

export async function renderSocialImage() {
  const bytes = await readFile(new URL("./og-share.jpg", import.meta.url));
  const src = `data:image/jpeg;base64,${bytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Foto a sangre */}
        <img
          src={src}
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 60%",
          }}
        />

        {/* Degradado inferior para que el texto se lea */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(2,17,45,0) 42%, rgba(2,17,45,0.78) 100%)",
          }}
        />

        {/* Marca y frase */}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              width: 118,
              height: 11,
              borderRadius: 6,
              background: "#fcd532",
              marginBottom: 22,
            }}
          />
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: -1,
              textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            }}
          >
            Parapente Bella Vista
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 32,
              color: "rgba(255,255,255,0.94)",
              textShadow: "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            Vuelos tándem en Nirgua, La Guaira y Mérida · Atrévete a tocar las
            nubes.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
