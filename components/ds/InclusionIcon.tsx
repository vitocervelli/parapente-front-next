/**
 * Iconos de los elementos incluidos. El backend guarda una clave
 * ("horse", "cake"...) para el trazo por defecto, y opcionalmente una imagen
 * propia (iconPath) que el panel sube y que tiene prioridad.
 *
 * Las claves vienen de InclusionItem.icon; si llega una desconocida se usa el
 * check genérico, de modo que dar de alta un elemento nuevo nunca rompe la web.
 */
import { mediaUrl } from "@/lib/api";

const paths: Record<string, React.ReactNode> = {
  paraglider: (
    <>
      <path d="M2 8a10 5 0 0 1 20 0l-6 3-4-2-4 2-6-3Z" />
      <path d="M8 11l3 6M16 11l-3 6" />
      <circle cx="12" cy="19" r="1.6" />
    </>
  ),
  banner: (
    <>
      <path d="M3 6h18v9l-3-1.5L15 15l-3-1.5L9 15l-3-1.5L3 15V6Z" />
      <path d="M3 6V4M21 6V4" />
    </>
  ),
  mountain: (
    <>
      <path d="M2 19h20L15 6l-4 7-2.5-3L2 19Z" />
      <circle cx="17.5" cy="5.5" r="1.8" />
    </>
  ),
  camera: (
    <>
      <rect x="2" y="7" width="15" height="11" rx="2" />
      <path d="M17 11l5-3v9l-5-3z" />
      <circle cx="9" cy="12.5" r="3" />
    </>
  ),
  horse: (
    <>
      <path d="M4 20c0-4 2-7 6-8l2-4 3-2 1 3 3 1-1 3c-1 5-4 7-8 7" />
      <path d="M9 20v-3M17 14v6" />
      <circle cx="16.5" cy="7.5" r=".9" fill="currentColor" />
    </>
  ),
  meal: (
    <>
      <path d="M4 3v8a2 2 0 0 0 4 0V3M6 11v10" />
      <path d="M17 3c-2 0-3 3-3 6s1 3 2 3v9" />
    </>
  ),
  roses: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M12 11v10M12 15l-4-2M12 15l4-2" />
    </>
  ),
  letter: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  teddy: (
    <>
      <circle cx="12" cy="10" r="5" />
      <circle cx="7" cy="5" r="2.5" />
      <circle cx="17" cy="5" r="2.5" />
      <path d="M9 15c-2 1-3 3-3 6h12c0-3-1-5-3-6" />
    </>
  ),
  "teddy-service": (
    <>
      <circle cx="10" cy="9" r="4" />
      <circle cx="6.5" cy="5" r="2" />
      <circle cx="13.5" cy="5" r="2" />
      <path d="M7 13c-2 1-3 3-3 6h12" />
      <path d="m16 17 2 2 4-4" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6Z" />
      <path d="M4 16h16M12 8V5M8.5 8V6M15.5 8V6" />
    </>
  ),
  soda: (
    <>
      <path d="M8 3h8l-1 18H9L8 3Z" />
      <path d="M8 9h8" />
    </>
  ),
  cookies: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="9" cy="14.5" r="1" fill="currentColor" />
      <circle cx="14" cy="15.5" r="1" fill="currentColor" />
    </>
  ),
  flowers: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M8 11v10M16 9.5 13 21M8 15l-4-2M8 15l4-2" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
};

/** Iconos disponibles, para el desplegable del catálogo en el panel. */
export const ICON_KEYS = Object.keys(paths);

/**
 * Pinta el icono de un elemento incluido o un extra. Si hay `path` (una imagen
 * que subió el panel) se muestra esa imagen; si no, se usa el trazo de la clave
 * `name`, que colorea con currentColor y nunca depende del backend.
 */
export function InclusionIcon({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null;
  className?: string;
}) {
  const src = mediaUrl(path);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- icono subido por el panel, ya en /uploads
      <img
        src={src}
        alt=""
        width={22}
        height={22}
        className={className ? `inclusion-icon-img ${className}` : "inclusion-icon-img"}
        aria-hidden="true"
      />
    );
  }

  const shape = paths[name] ?? paths.check;

  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
