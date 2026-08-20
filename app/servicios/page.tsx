import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowCta } from "@/components/ds/ArrowCta";
import { Button } from "@/components/ds/Button";
import { SectionHeading } from "@/components/ds/SectionHeading";
import { Tabs } from "@/components/ds/Tabs";
import { Tag } from "@/components/ds/Tag";
import { TourCard } from "@/components/ds/TourCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getLocations, getServices, mediaUrl, type Service } from "@/lib/api";

export const metadata: Metadata = {
  title: "Servicios y promociones — Parapente Bella Vista",
  description:
    "Vuelo tándem en parapente y promociones para celebrar: pedidas de mano, aniversarios y cumpleaños en el aire. Precios de referencia.",
};

const requirements = [
  { value: "40–110 kg", label: "Peso del pasajero" },
  { value: "8+ años", label: "Menores con autorización" },
  { value: "Calzado cerrado", label: "Y ropa cómoda" },
  { value: "Clima", label: "Volamos solo con viento seguro" },
];

const faq = [
  {
    q: "¿Necesito experiencia?",
    a: "Ninguna. Tu piloto certificado controla todo el vuelo; tú solo corres unos pasos en el despegue y disfrutas. Volamos con pasajeros desde los 8 años hasta más de 70.",
  },
  {
    q: "¿Qué llevo?",
    a: "Ropa cómoda, calzado cerrado (deportivo o botas), protector solar y lentes de sol. Nosotros ponemos casco, arnés y todo el equipo homologado, revisado a diario.",
  },
  {
    q: "¿Es seguro?",
    a: "Sí. Pilotos certificados, equipo homologado y seguro de accidentes incluido en cada vuelo. En más de 500 vuelos, nuestra prioridad siempre es la misma: que aterrices con ganas de repetir.",
  },
  {
    q: "¿Y el clima?",
    a: "Volamos solo con condiciones seguras. Si el viento no acompaña, reprogramamos tu vuelo sin costo — el cielo no se va a ninguna parte.",
  },
];

const FALLBACK_IMAGE = "/assets/imagery/flight-valley.jpg";

/** Los tags del catálogo salen de la duración y del tamaño del paquete. */
function tagsFor(service: Service): string[] {
  const tags: string[] = [];
  if (service.durationMinutes) tags.push(`${service.durationMinutes} min`);
  if (service.people > 1) tags.push(`Para ${service.people} personas`);
  return tags;
}

function toCard(service: Service) {
  return {
    key: service.slug,
    image: mediaUrl(service.image) ?? FALLBACK_IMAGE,
    badge: service.badge,
    title: service.name,
    description: service.description ?? service.tagline,
    tags: tagsFor(service),
    price: service.price.display,
    priceNote: service.priceNote,
    inclusions: service.inclusions.map((i) => ({
      id: i.id,
      label: i.label,
      icon: i.icon,
      iconPath: i.iconPath,
    })),
  };
}

export default async function ServiciosPage() {
  const [services, locations] = await Promise.all([getServices(), getLocations()]);

  // Una sección por zona activa, con los servicios que se ofrecen en ella.
  // Un servicio en varias zonas aparece en cada una.
  const zonas = locations
    .map((loc) => ({
      loc,
      services: services.filter((s) => s.locations.some((l) => l.slug === loc.slug)),
    }))
    .filter((z) => z.services.length > 0);

  return (
    <div className="svc-page">
      <SiteNav active="/servicios" />

      <header className="page-hero">
        <Image src="/uploads/pexels-jaclou-dl-5303379.jpg" alt="" fill priority sizes="100vw" />
        <div className="page-hero__scrim" />
        <div className="page-hero__content">
          <span className="page-hero__kicker">Servicios</span>
          <h1>Tu experiencia</h1>
          <div className="page-hero__script">completa aquí</div>
          <p>
            El vuelo de siempre y las promociones para celebrar en el aire. Precios de referencia;
            escríbenos y te armamos el día completo.
          </p>
        </div>
      </header>

      {zonas.map(({ loc, services: zonaServices }, i) => {
        // Dentro de cada ciudad separamos los vuelos de siempre de las
        // promociones para celebrar. Los subtítulos solo salen cuando hay de
        // los dos tipos; si una zona tiene solo uno, se muestra sin encabezar.
        const grupos = [
          { label: "Vuelos", items: zonaServices.filter((s) => s.type === "standalone") },
          { label: "Promociones", items: zonaServices.filter((s) => s.type === "promotion") },
        ].filter((g) => g.items.length > 0);
        const conTitulos = grupos.length > 1;

        return (
          <section
            key={loc.slug}
            className={`svc-section ${i % 2 === 0 ? "svc-section--air" : "svc-section--land"}`}
          >
            <SectionHeading
              tone="light"
              kicker={loc.badge ?? loc.region ?? "Zona de vuelo"}
              title={loc.name}
            />
            {loc.description && <p className="svc-zone-desc">{loc.description}</p>}

            {grupos.map((grupo) => (
              <div key={grupo.label} className="svc-group">
                {conTitulos && <h3 className="svc-subhead">{grupo.label}</h3>}
                <div className="svc-grid">
                  {grupo.items.map((s) => {
                    const { key, ...card } = toCard(s);
                    return <TourCard key={key} {...card} />;
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {services.length === 0 && (
        <section className="svc-section svc-section--air">
          <p className="svc-empty">
            Estamos actualizando nuestras experiencias. Escríbenos por WhatsApp y te contamos todo.
          </p>
        </section>
      )}

      <section className="svc-section svc-section--events">
        <div className="svc-custom">
          <span className="svc-custom__title">¿Despedidas, empresas, aniversarios?</span>
          <p>
            Armamos paquetes a la medida para grupos: vuelos, paseos, comida de La Panamericana y
            celebración en la base. Cuéntanos tu plan.
          </p>
          <Link href="/contacto" className="cta cta--blue cta--sm">
            Pide tu paquete <ArrowCta />
          </Link>
        </div>
      </section>

      <section className="pana">
        <div className="pana__inner">
          <div className="pana__photo">
            <Image
              src="/uploads/IMG_4429.JPG.jpeg"
              alt="Panadería La Panamericana en la base"
              width={1200}
              height={900}
              sizes="(max-width: 680px) 100vw, 50vw"
            />
          </div>
          <div className="pana__text">
            <span className="pana__kicker">Aliado oficial</span>
            <div className="pana__title">Panadería La Panamericana</div>
            <p>
              Recarga energías antes o después de tu vuelo sin moverte de la base: café, pan recién
              horneado y desayunos criollos. Todo en un solo lugar, tu experiencia completa aquí.
            </p>
            <div className="pana__tags">
              <Tag>Desayunos</Tag>
              <Tag>Café</Tag>
              <Tag>En la base</Tag>
            </div>
          </div>
        </div>
      </section>

      <section className="reqs">
        <div className="reqs__inner">
          <SectionHeading tone="dark" kicker="Antes de volar" title="Requisitos" script="del vuelo" />
          <div className="reqs__grid">
            {requirements.map((r) => (
              <div key={r.value} className="req-card">
                <span className="req-card__value">{r.value}</span>
                <span className="req-card__label">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq">
        <SectionHeading
          tone="light"
          kicker="Preguntas frecuentes"
          title="Antes de"
          script="lanzarte"
        />
        <div className="faq__tabs">
          <Tabs
            tabs={faq.map((f) => f.q)}
            panels={faq.map((f) => (
              <p key={f.q} className="faq__answer">
                {f.a}
              </p>
            ))}
          />
        </div>
      </section>

      <section className="svc-cta">
        <Image src="/uploads/jaclou-dl-paragliders-4492643_1920.jpg" alt="" fill sizes="100vw" />
        <div className="svc-cta__scrim" />
        <div className="svc-cta__content">
          <div className="svc-cta__title">Arma tu día de aventura</div>
          <div className="svc-cta__script">a tu medida</div>
          <Button size="lg" href="/reserva">
            Reserva ahora
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
