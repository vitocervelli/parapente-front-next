import { ImageResponse } from "next/og";

/**
 * Tarjeta que se ve al compartir la web por WhatsApp, Instagram, Facebook, X,
 * Telegram, etc. La generan las convenciones `opengraph-image` y `twitter-image`
 * de Next; ambas la reutilizan desde aquí para no duplicar el diseño.
 *
 * 1200×630 es la proporción que piden las redes para la tarjeta grande.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Parapente Bella Vista — Vuelos tándem en parapente en Nirgua, Yaracuy";

export function renderSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          padding: 76,
          color: "#ffffff",
          fontFamily: "sans-serif",
          background:
            "linear-gradient(135deg, #022f6d 0%, #004aad 55%, #1a63c9 100%)",
        }}
      >
        {/* Parapente decorativo, a la derecha y separado del texto */}
        <svg
          width="470"
          height="320"
          viewBox="0 0 140 96"
          fill="none"
          style={{ position: "absolute", top: 150, right: 70 }}
        >
          <path
            d="M8 44 Q70 6 132 44 Q70 26 8 44 Z"
            fill="rgba(255,255,255,0.20)"
          />
          <path
            d="M14 42 L64 82"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M126 42 L76 82"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="70" cy="86" r="6.5" fill="#fcd532" />
        </svg>

        {/* Bloque de texto */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
          <div
            style={{
              width: 132,
              height: 12,
              borderRadius: 6,
              background: "#fcd532",
              marginBottom: 30,
            }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#fcd532",
              marginBottom: 14,
            }}
          >
            NIRGUA · LA GUAIRA · MÉRIDA
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.02,
              marginBottom: 20,
            }}
          >
            Parapente Bella Vista
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              lineHeight: 1.3,
              maxWidth: 780,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Vuelos tándem en parapente. Pilotos certificados, equipo homologado
            y seguro incluido. Atrévete a tocar las nubes.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
