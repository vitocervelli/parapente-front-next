import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const kioskSans = localFont({
  src: "./fonts/KioskSans.otf",
  variable: "--font-kiosk-sans",
});

const kioskSansPrint = localFont({
  src: "./fonts/KioskSans-Print.otf",
  variable: "--font-kiosk-sans-print",
});

const auraAT = localFont({
  src: "./fonts/AuraAT-Regular.otf",
  variable: "--font-aura",
});

const goliath = localFont({
  src: "./fonts/GoliathAlternate.ttf",
  variable: "--font-goliath",
});

const regularBrush = localFont({
  src: "./fonts/RegularBrush.otf",
  variable: "--font-regular-brush",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://parapente-front-next.vercel.app";
const TITULO = "Parapente Bella Vista — Vuela en Nirgua, La Guaira y Mérida";
const DESCRIPCION =
  "Vuelos tándem en parapente, paseos a caballo y 4x4 en Nirgua, Yaracuy. Pilotos certificados, equipo homologado y seguro incluido. Atrévete a tocar las nubes con tus manos.";

export const metadata: Metadata = {
  // Base para resolver a URL absoluta la imagen social (opengraph-image /
  // twitter-image) y las rutas canónicas: WhatsApp, Instagram y compañía
  // exigen URLs absolutas para mostrar la vista previa.
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRIPCION,
  // La imagen la aportan automáticamente app/opengraph-image.tsx y
  // app/twitter-image.tsx; aquí solo el texto y el contexto del enlace.
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Parapente Bella Vista",
    title: TITULO,
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${barlow.variable} ${kioskSans.variable} ${kioskSansPrint.variable} ${auraAT.variable} ${goliath.variable} ${regularBrush.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
