import type { Metadata } from "next";
import Image from "next/image";
import { EmbajadoresForm } from "@/components/embajadores/EmbajadoresForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { igAt, igUrl } from "@/lib/site";

/**
 * Página OCULTA para captar embajadores e influencers: no se enlaza desde
 * ningún sitio (ni menú, ni pie, ni sitemap) y se pide a los buscadores que no
 * la indexen. Solo se llega con la URL que el equipo comparte.
 */
export const metadata: Metadata = {
  title: "Embajadores — Parapente Bella Vista",
  description: "Crea contenido volando con nosotros en Nirgua, La Guaira y Mérida.",
  robots: { index: false, follow: false },
};

export default function EmbajadoresPage() {
  return (
    <>
      <SiteNav />

      <header className="page-hero page-hero--compact">
        <Image src="/assets/imagery/flight-sea.jpg" alt="" fill priority sizes="100vw" />
        <div className="page-hero__scrim" />
        <div className="page-hero__content">
          <span className="page-hero__kicker">Embajadores</span>
          <h1>Crea con nosotros</h1>
          <div className="page-hero__script">desde el cielo</div>
          <p>
            Buscamos creadores que vivan la aventura y quieran contarla. Si tu contenido inspira a
            otros a atreverse, queremos conocerte.
          </p>
        </div>
      </header>

      <section className="consulta">
        <div className="consulta__grid">
          <EmbajadoresForm />
          <div className="consulta__aside">
            <div className="info-card">
              <span className="info-card__title">Qué buscamos</span>
              <p>
                Perfiles de viajes, deporte, aventura o lifestyle con una comunidad real, sin
                importar el tamaño. Lo que más valoramos es que tu contenido sea auténtico.
              </p>
            </div>
            <div className="info-card info-card--tight">
              <span className="info-card__title">Cómo funciona</span>
              <span>
                1. Nos dejas tus datos y tus redes.
                <br />
                2. Revisamos tu perfil.
                <br />
                3. Si encaja, te contactamos para planear el vuelo y el contenido.
              </span>
            </div>
            <div className="info-card info-card--tight">
              <span className="info-card__title">Conócenos</span>
              <a className="accent" href={igUrl} target="_blank" rel="noopener noreferrer">
                {igAt}
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter showWhatsapp />
    </>
  );
}
