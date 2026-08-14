import type { Metadata } from "next";
import Image from "next/image";
import { ConsultaForm } from "@/components/contacto/ConsultaForm";
import { Button } from "@/components/ds/Button";
import { SectionHeading } from "@/components/ds/SectionHeading";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getLocations, getServices } from "@/lib/api";
import { igAt, igUrl, site, waUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contacto — Parapente Bella Vista",
  description:
    "Escríbenos tus dudas sobre volar en parapente en Nirgua, La Guaira o Mérida. Sábados, domingos y feriados de 8:00 AM a 5:00 PM.",
};

export default async function ContactoPage() {
  const [services, locations] = await Promise.all([getServices(), getLocations()]);
  const experiencias = services.map((s) => s.name);
  // Las zonas del selector salen de las localidades activas del panel.
  const ciudades = [...locations.map((l) => l.name), "Todavía no lo sé"];

  return (
    <>
      <SiteNav active="/contacto" />

      <header className="page-hero page-hero--compact">
        <Image
          src="/uploads/jaclou-dl-paragliding-4026467_1920.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="page-hero__scrim" />
        <div className="page-hero__content">
          <span className="page-hero__kicker">Contacto</span>
          <h1>Hablemos</h1>
          <div className="page-hero__script">antes de volar</div>
        </div>
      </header>

      <section id="consulta" className="consulta">
        <div className="consulta__grid">
          <ConsultaForm experiencias={experiencias} ciudades={ciudades} />
          <div className="consulta__aside">
            <div className="info-card">
              <span className="info-card__title">Directo al grano</span>
              <p>¿Prefieres escribirnos tú? Estamos pendientes del WhatsApp todos los días.</p>
              <Button variant="outline" size="md" href={waUrl}>
                Abrir WhatsApp
              </Button>
              <span>{site.whatsapp}</span>
            </div>
            <div className="info-card info-card--tight">
              <span className="info-card__title">Horario</span>
              <span>
                Sábados, domingos y feriados
                <br />
                8:00 AM – 5:00 PM
                <br />
                <span className="info-card__muted">
                  Entre semana con reserva previa para grupos.
                </span>
              </span>
            </div>
            <div className="info-card info-card--tight">
              <span className="info-card__title">Redes</span>
              <a className="accent" href={igUrl} target="_blank" rel="noopener noreferrer">
                {igAt}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="visit">
        <div className="visit__inner">
          <figure
            className="polaroid polaroid--auto"
            style={{ "--tilt": "-1deg" } as React.CSSProperties}
          >
            <span
              className="polaroid__tape"
              style={{ "--tape-tilt": "-4deg" } as React.CSSProperties}
            />
            <Image
              src="/uploads/IMG_2986.JPEG"
              alt="Recepción de Parapente Bella Vista"
              width={1200}
              height={900}
              sizes="(max-width: 940px) 100vw, 45vw"
            />
          </figure>
          <div className="visit__text">
            <span className="visit__kicker">Visítanos</span>
            <span className="visit__title">Te esperamos en la base</span>
            <p>
              Pasa por nuestra oficina en Nirgua: resuelve tus dudas en persona, conoce el equipo y
              prueba el pan de La Panamericana mientras planeamos tu aventura.
            </p>
            <p className="visit__brush">{site.tagline}</p>
          </div>
        </div>
      </section>

      {locations.length > 0 && (
        <section className="locations">
          <SectionHeading tone="light" kicker="Zonas de vuelo" title="Tres cielos" script="para ti" />
          <div className="locations__grid">
            {locations.map((l) => (
              <div key={l.slug} className="loc-card">
                {l.badge && <span className="loc-card__badge">{l.badge}</span>}
                <span className={`loc-card__name${l.badge ? "" : " loc-card__name--pad"}`}>
                  {l.name}
                </span>
                {l.region && <span className="loc-card__region">{l.region}</span>}
                {l.description && <p>{l.description}</p>}
              </div>
            ))}
          </div>
          <p className="locations__note">
            Escríbenos por WhatsApp y te enviamos la ubicación exacta del punto de encuentro.
          </p>
        </section>
      )}

      <SiteFooter showWhatsapp />
    </>
  );
}
