import Image from "next/image";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { InclusionIcon } from "./InclusionIcon";
import { Tag } from "./Tag";

type InclusionRow = { id: number; label: string; icon: string };

type Props = {
  image: string;
  badge?: string | null;
  title: string;
  description?: string | null;
  tags?: string[];
  price: string;
  priceNote?: string;
  inclusions?: InclusionRow[];
  cta?: string;
  ctaHref?: string;
};

export function TourCard({
  image,
  badge,
  title,
  description,
  tags = [],
  price,
  priceNote = "por persona",
  inclusions = [],
  cta = "Reserva",
  ctaHref = "/reserva",
}: Props) {
  return (
    <article className="pbv-tour">
      <div className="pbv-tour__media">
        <Image src={image} alt="" fill sizes="(max-width: 680px) 100vw, 45vw" />
        {badge && (
          <span className="pbv-tour__badge">
            <Badge tilt>{badge}</Badge>
          </span>
        )}
      </div>
      <div className="pbv-tour__body">
        <h3 className="pbv-tour__title">{title}</h3>
        {description && <p className="pbv-tour__desc">{description}</p>}
        {tags.length > 0 && (
          <div className="pbv-tour__tags">
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
        {inclusions.length > 0 && (
          <div className="pbv-tour__includes">
            <span className="pbv-tour__includes-title">Incluye</span>
            <ul className="pbv-tour__includes-list">
              {inclusions.map((i) => (
                <li key={i.id}>
                  <InclusionIcon name={i.icon} />
                  <span>{i.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="pbv-tour__foot">
          <span className="pbv-tour__price">
            <b>{price}</b>
            <span>{priceNote}</span>
          </span>
          <Button size="sm" href={ctaHref}>
            {cta}
          </Button>
        </div>
      </div>
    </article>
  );
}
