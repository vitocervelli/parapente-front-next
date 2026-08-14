import Image from "next/image";
import Link from "next/link";
import { getLocations } from "@/lib/api";
import { igAt, igUrl, site, waUrl } from "@/lib/site";

type Props = {
  /** Adds the top hairline used on the dark pages */
  bordered?: boolean;
  /** Contacto lists the WhatsApp number ahead of Instagram */
  showWhatsapp?: boolean;
};

export async function SiteFooter({ bordered, showWhatsapp }: Props) {
  // Las zonas de vuelo salen de las localidades activas del panel.
  const locations = await getLocations();
  const zonas = locations.map((l) =>
    [l.name, l.region].filter(Boolean).join(", ") + (l.badge ? ` — ${l.badge}` : ""),
  );

  return (
    <footer className={`site-footer${bordered ? " site-footer--line" : ""}`}>
      <div className="site-footer__inner">
        <div>
          <div className="site-footer__brand-row">
            <Image src="/assets/logo-mark.png" alt="" width={1881} height={1140} />
            <span className="site-footer__brand-name">{site.name}</span>
          </div>
          <div className="site-footer__tagline">{site.tagline}</div>
        </div>
        <div className="site-footer__col">
          <div className="site-footer__col-title">Zonas de vuelo</div>
          {zonas.length > 0
            ? zonas.map((z, i) => (
                <span key={z}>
                  {z}
                  {i < zonas.length - 1 && <br />}
                </span>
              ))
            : "Nirgua · La Guaira · Mérida"}
        </div>
        <div className="site-footer__col">
          <div className="site-footer__col-title">Contacto</div>
          {showWhatsapp ? (
            <>
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp {site.whatsapp}
              </a>
              <br />
              <a className="accent" href={igUrl} target="_blank" rel="noopener noreferrer">
                {igAt}
              </a>
            </>
          ) : (
            <>
              <a className="accent" href={igUrl} target="_blank" rel="noopener noreferrer">
                {igAt}
              </a>
              <br />
              <Link href="/reserva">Reserva tu vuelo</Link>
            </>
          )}
        </div>
      </div>
      <div className="site-footer__legal">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Vuela responsable — sujeto a condiciones de viento</span>
      </div>
    </footer>
  );
}
