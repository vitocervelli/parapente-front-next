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

export const metadata: Metadata = {
  title: "Parapente Bella Vista — Vuela en Nirgua, La Guaira y Mérida",
  description:
    "Vuelos tándem en parapente, paseos a caballo y 4x4 en Nirgua, Yaracuy. Pilotos certificados, equipo homologado y seguro incluido. Atrévete a tocar las nubes con tus manos.",
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
