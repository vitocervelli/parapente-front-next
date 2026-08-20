import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ds/Button";
import { SectionHeading } from "@/components/ds/SectionHeading";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getGalleryPhotos, mediaUrl } from "@/lib/api";
import { igAt, igUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Galería — Parapente Bella Vista",
  description:
    "Fotos de nuestros vuelos en Nirgua, La Guaira y Mérida. Cada vuelo deja una historia — la próxima puede ser la tuya.",
};

// Inclinaciones decorativas de las polaroids: se reparten por posición para
// que la galería conserve su aire desordenado sin guardar nada en el panel.
const FEATURED_TILTS = ["-1deg", ".9deg", "-.7deg", ".6deg"];
const TAPE_TILTS = ["-4deg", "3deg", "-3deg", "4deg"];
const STRIP_TILTS = ["-.6deg", ".5deg", "-.4deg", ".7deg", "-.7deg", ".4deg", "-.5deg"];

export default async function GaleriaPage() {
  const fotos = await getGalleryPhotos();
  const featured = fotos.filter((f) => f.isFeatured);
  const strip = fotos.filter((f) => !f.isFeatured);

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
          {featured.map((f, i) => (
            <figure
              key={f.id}
              className="polaroid"
              style={{ "--tilt": FEATURED_TILTS[i % FEATURED_TILTS.length] } as React.CSSProperties}
            >
              <span
                className="polaroid__tape"
                style={{ "--tape-tilt": TAPE_TILTS[i % TAPE_TILTS.length] } as React.CSSProperties}
              />
              <Image src={mediaUrl(f.imagePath)!} alt={f.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
            </figure>
          ))}
        </div>
      </section>

      {strip.length > 0 && (
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
                  key={`${s.id}-${i}`}
                  className={`strip-item${s.isWide ? " strip-item--wide" : ""}`}
                  style={{ "--tilt": STRIP_TILTS[i % STRIP_TILTS.length] } as React.CSSProperties}
                >
                  <Image
                    src={mediaUrl(s.imagePath)!}
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
      )}

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
