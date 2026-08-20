import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/home/HeroVideo";
import { Reel } from "@/components/home/Reel";
import { ArrowCta } from "@/components/ds/ArrowCta";
import { SectionHeading } from "@/components/ds/SectionHeading";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { WhatsappFloat } from "@/components/site/WhatsappFloat";
import {
  getAllies,
  getLocations,
  getReels,
  getServices,
  getStats,
  mediaUrl,
  type Service,
} from "@/lib/api";
import { igAt, igUrl, site } from "@/lib/site";

const tickerText =
  "Vuela · Atrévete · Vive · Nirgua · La Guaira · Mérida · Vuela · Atrévete · Vive · Nirgua · La Guaira · Mérida · ";

const FALLBACK_IMAGE = "/assets/imagery/flight-valley.jpg";

/**
 * El mosaico arranca con una tarjeta ancha y otra mediana; el resto van a
 * cuartos. Derivarlo del orden mantiene el grid cuadrado aunque desde el panel
 * se añadan o quiten promociones.
 */
function spanFor(index: number): "w7" | "w5" | "w4" {
  if (index === 0) return "w7";
  if (index === 1) return "w5";
  return "w4";
}

/** Frase corta de la tarjeta: la del catálogo o, si no hay, lo que incluye. */
function blurbFor(service: Service): string {
  if (service.tagline) return service.tagline;
  if (service.inclusions.length > 0) {
    return service.inclusions.slice(0, 3).map((i) => i.label).join(" · ");
  }
  return service.priceNote;
}

const steps = [
  {
    image: "/uploads/IMG_4429.JPG.jpeg",
    alt: "Reserva tu vuelo",
    tilt: "-1.2deg",
    tapeTilt: "-4deg",
    title: "Reserva tu plaza en la web",
    desc: "Elige día, hora y experiencia. Te apartamos las plazas y confirmamos en cuanto validemos el pago.",
  },
  {
    image: "/uploads/IMG_4432.JPG.jpeg",
    alt: "Subida en 4x4 al despegue",
    tilt: "1deg",
    tapeTilt: "3deg",
    offset: true,
    position: "center 60%",
    title: "Sube al despegue en 4x4",
    desc: "Montaña arriba en nuestros Toyota clásicos mientras el piloto revisa el equipo homologado.",
  },
  {
    image: "/uploads/IMG_5605.JPG.jpeg",
    alt: "Preparando el despegue",
    tilt: "-1deg",
    tapeTilt: "-3deg",
    title: "Corre unos pasos y vuela",
    desc: "El piloto controla todo el vuelo. Tú solo disfrutas — y aterrizas con ganas de repetir.",
  },
] as const;

const igPosts = [
  "/uploads/IMG_4429.JPG.jpeg",
  "/uploads/IMG_4430.JPG.jpeg",
  "/uploads/IMG_4431.JPG.jpeg",
  "/uploads/IMG_4432.JPG.jpeg",
];

const trust = ["Pilotos certificados", "Equipo homologado", "Seguro incluido", "+500 vuelos seguros"];

export default async function Home() {
  const [services, cifras, locations, aliados, reels] = await Promise.all([
    getServices({ onlyHome: true }),
    getStats(),
    getLocations(),
    getAllies(),
    getReels(),
  ]);

  // El número real de personas que han volado (paquetes de X personas cuentan
  // como X). Si el backend no responde, se mantiene el valor de marketing.
  const stats = [
    { num: cifras ? String(cifras.peopleFlown) : "+500", label: "Vuelos realizados" },
    { num: locations.length > 0 ? String(locations.length) : "3", label: "Zonas de vuelo" },
    { num: "100%", label: "Seguridad certificada" },
  ];

  return (
    <>
      <SiteNav variant="home" active="/" />

      <header className="hero">
        <div className="hero__bg">
          <Image src="/assets/imagery/hero-sky.jpg" alt="" fill priority sizes="100vw" />
          <HeroVideo src={site.heroVideoUrl} />
          <div className="hero__scrim" />
        </div>
        <div className="hero__content">
          <div className="hero__kicker">Atrévete a tocar las nubes con tus manos</div>
          <h1 className="hero__title">PARAPENTE</h1>
          <div className="hero__script">Bella Vista</div>
          <div className="hero__ctas">
            <Link href="/reserva" className="cta">
              Reserva tu vuelo <ArrowCta />
            </Link>
            <Link href="/servicios" className="cta-outline">
              Ver servicios
            </Link>
          </div>
        </div>
        <div className="hero__scroll" />
      </header>

      <div className="ticker">
        <div className="ticker__track">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>

      <section className="exp">
        <div className="exp__head">
          <SectionHeading tone="light" kicker="Experiencias" title="Elige tu" script="aventura" />
          <p>
            El vuelo de siempre y las promociones para celebrar en el aire. Combínalas en un solo
            día.
          </p>
        </div>
        <div className="exp__grid">
          {services.map((s, i) => (
            <Link
              key={s.slug}
              href="/servicios"
              className={`exp-card exp-card--${spanFor(i)}`}
            >
              <Image
                className="exp-card__img"
                src={mediaUrl(s.image) ?? FALLBACK_IMAGE}
                alt={s.name}
                fill
                sizes="(max-width: 860px) 100vw, 50vw"
              />
              <span className="exp-card__scrim" />
              {s.badge && <span className="exp-card__badge">{s.badge}</span>}
              <span className="exp-card__info">
                <span className="exp-card__text">
                  <span className="exp-card__title">{s.name}</span>
                  <span className="exp-card__desc">{blurbFor(s)}</span>
                </span>
                <span className="exp-card__price">{s.price.display}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="steps">
        <div className="steps__inner">
          <SectionHeading tone="dark" kicker="Tu día de vuelo" title="Así de" script="fácil" />
          <div className="steps__grid">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className={`step-card${"offset" in s && s.offset ? " step-card--offset" : ""}`}
                style={{ "--tilt": s.tilt } as React.CSSProperties}
              >
                <span
                  className="step-card__tape"
                  style={{ "--tape-tilt": s.tapeTilt } as React.CSSProperties}
                />
                <span className="step-card__media">
                  <Image
                    src={s.image}
                    alt={s.alt}
                    fill
                    sizes="(max-width: 560px) 100vw, 33vw"
                    style={"position" in s && s.position ? { objectPosition: s.position } : undefined}
                  />
                  <span className="step-card__num">{i + 1}</span>
                </span>
                <span className="step-card__body">
                  <span className="step-card__title">{s.title}</span>
                  <span className="step-card__desc">{s.desc}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="steps__cta">
            <Link href="/reserva" className="cta cta--md">
              Empieza por el paso 1 <ArrowCta />
            </Link>
          </div>
        </div>
      </section>

      {reels.length > 0 && (
        <section className="reels">
          <div className="reels__inner">
            <div className="section-row">
              <SectionHeading tone="dark" kicker="Reels" title="Vívelo en" script="movimiento" />
              <a className="link-underline" href={igUrl} target="_blank" rel="noopener noreferrer">
                Más reels en Instagram →
              </a>
            </div>
            <div className="reels__grid">
              {reels.map((reel) => (
                <Reel
                  key={reel.id}
                  src={mediaUrl(reel.videoPath)!}
                  poster={mediaUrl(reel.posterPath)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="breaker">
        <Image
          src="/assets/imagery/breaker-hills.jpg"
          alt="Montañas verdes vistas desde el aire"
          fill
          sizes="100vw"
        />
        <div className="breaker__scrim" />
        <div className="breaker__content">
          <div className="breaker__title">Volar es un sueño</div>
          <div className="breaker__script">que solo vivirás aquí</div>
          <div className="breaker__stats">
            {stats.map((s) => (
              <div key={s.label} className="stat">
                <span className="stat__num">{s.num}</span>
                <span className="stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="trust__inner">
          {trust.map((t) => (
            <span key={t} className="trust__item">
              <span className="trust__check">✓</span>
              <span className="trust__label">{t}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="testimonials">
        <div className="testimonials__inner">
          <span className="testimonials__kicker">Lo que dicen al aterrizar</span>
          <blockquote>
            Nunca había sentido algo así — el despegue te roba el aliento y después paz total sobre el
            valle
          </blockquote>
          <span className="testimonials__author">— Mariana G. · vuelo tándem, Nirgua</span>
          <div className="testimonials__more">
            <span className="testimonials__quote">
              «Mi hija de 9 años voló conmigo. Los pilotos te dan confianza total.»{" "}
              <em>— Carlos R.</em>
            </span>
            <span className="testimonials__quote">
              «Cumpleaños volando, 4x4 y desayuno en La Panamericana. Un día redondo.»{" "}
              <em>— Andreína P.</em>
            </span>
          </div>
        </div>
      </section>

      <section className="ig">
        <div className="ig__head section-row">
          <SectionHeading tone="dark" kicker="Instagram" title="Síguenos" script={igAt} />
          <a className="link-underline" href={igUrl} target="_blank" rel="noopener noreferrer">
            Ver perfil →
          </a>
        </div>
        <div className="ig__grid">
          {igPosts.map((src) => (
            <a
              key={src}
              className="ig__item"
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image src={src} alt="Post de Instagram" width={800} height={1000} sizes="25vw" />
            </a>
          ))}
        </div>
      </section>

      <section className="allies">
        <div className="allies__inner">
          <SectionHeading tone="light" kicker="Aliados" title="Vuelan con" script="nosotros" />
          <div className="allies__grid">
            {aliados.map((a) => {
              const logo = mediaUrl(a.logoPath);
              return (
                <div key={a.id} className={`ally${logo ? " ally--brand" : ""}`}>
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo subido por el panel, dominio propio
                    <img src={logo} alt={a.kind ? `${a.name} — ${a.kind}` : a.name} className="ally__logo" width={140} height={140} />
                  ) : (
                    <span className="ally__name">{a.name}</span>
                  )}
                  {a.kind && <span className="ally__type">{a.kind}</span>}
                </div>
              );
            })}
          </div>
          <div className="allies__row">
            <p>
              ¿Tienes una marca y quieres que miles de aventureros la vean cada fin de semana?
              Patrocina nuestras experiencias y vuela con nosotros.
            </p>
            <Link href="/contacto" className="cta cta--md cta--blue">
              Quiero ser aliado <ArrowCta />
            </Link>
          </div>
        </div>
      </section>

      <section className="cta-final">
        <Image src="/assets/imagery/flight-clouds.jpg" alt="" fill sizes="100vw" />
        <div className="cta-final__scrim" />
        <div className="cta-final__content">
          <div className="cta-final__title">VUELA HOY</div>
          <div className="cta-final__script">tu cupo te espera</div>
          <Link href="/reserva" className="cta">
            Reserva ahora <ArrowCta />
          </Link>
        </div>
      </section>

      <WhatsappFloat />
      <SiteFooter bordered />
    </>
  );
}
