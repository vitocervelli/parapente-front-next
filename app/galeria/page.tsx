import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ds/Button";
import { SectionHeading } from "@/components/ds/SectionHeading";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { igAt, igUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Galería — Parapente Bella Vista",
  description:
    "Fotos de nuestros vuelos en Nirgua, La Guaira y Mérida. Cada vuelo deja una historia — la próxima puede ser la tuya.",
};

const featured = [
  {
    src: "/uploads/IMG_0021.JPG.jpeg",
    alt: "Vuelo tándem sobre el valle",
    tilt: "-1deg",
    tapeTilt: "-4deg",
  },
  {
    src: "/uploads/IMG_1192.JPG-7c08766d.jpeg",
    alt: "Pura felicidad en el aire",
    tilt: ".9deg",
    tapeTilt: "3deg",
  },
];

const strip = [
  { src: "/uploads/IMG_1332.JPG.jpeg", alt: "Volando sobre las montañas", tilt: "-.6deg" },
  { src: "/uploads/IMG_5605.JPG-4b128596.jpeg", alt: "Preparando el despegue", tilt: ".5deg", wide: true },
  { src: "/uploads/IMG_3266.JPG.jpeg", alt: "Ala multicolor sobre el valle", tilt: "-.4deg" },
  { src: "/uploads/IMG_9789.JPG.jpeg", alt: "Sonrisas en el aire", tilt: ".7deg" },
  { src: "/uploads/IMG_4752.JPG.jpeg", alt: "Despegue con ala azul", tilt: "-.7deg" },
  { src: "/uploads/IMG_4353.JPG-a66a10fa.jpeg", alt: "Tándem sobre el bosque", tilt: ".4deg" },
  { src: "/uploads/IMG_0019.JPG-3a06563c.jpeg", alt: "Sobre el embalse", tilt: "-.5deg" },
];

export default function GaleriaPage() {
  return (
    <div className="gal-page">
      <SiteNav active="/galeria" />

      <header className="gal-header">
        <SectionHeading
          tone="dark"
          align="center"
          kicker="Galería"
          title="Momentos que"
          script="vuelan"
        />
        <p>
          Cada vuelo deja una historia. Estas son algunas de las nuestras — la próxima puede ser la
          tuya.
        </p>
      </header>

      <section className="gal-featured">
        <div className="gal-featured__grid">
          {featured.map((f) => (
            <figure
              key={f.src}
              className="polaroid"
              style={{ "--tilt": f.tilt } as React.CSSProperties}
            >
              <span
                className="polaroid__tape"
                style={{ "--tape-tilt": f.tapeTilt } as React.CSSProperties}
              />
              <Image src={f.src} alt={f.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
            </figure>
          ))}
        </div>
      </section>

      <section className="filmstrip">
        <div className="filmstrip__head">
          <span className="filmstrip__title">Más momentos</span>
          <span className="filmstrip__hint">pasa el cursor para pausar</span>
        </div>
        <div className="pbv-strip">
          <div className="pbv-track">
            {/* Duplicated so the marquee loops seamlessly at -50% */}
            {[...strip, ...strip].map((s, i) => (
              <figure
                key={`${s.src}-${i}`}
                className={`strip-item${s.wide ? " strip-item--wide" : ""}`}
                style={{ "--tilt": s.tilt } as React.CSSProperties}
              >
                <Image
                  src={s.src}
                  alt={i < strip.length ? s.alt : ""}
                  width={800}
                  height={1000}
                  sizes="340px"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="gal-igcta">
        <div className="gal-igcta__inner">
          <div className="gal-igcta__brush">¿Volaste con nosotros? Etiquétanos y aparece aquí</div>
          <Button variant="outline" size="md" href={igUrl}>
            {igAt}
          </Button>
        </div>
      </section>

      <SiteFooter bordered />
    </div>
  );
}
