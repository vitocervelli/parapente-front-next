import Link from "next/link";
import { BookingsTable } from "./BookingsTable";
import { listBookings, listOverdueBookings } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

/**
 * Filtros de la bandeja. Los primeros son los que piden acción del equipo; el
 * resto cubre cada estado por si hay que buscar una reserva concreta. Las dos
 * formas de cancelación se agrupan en un solo chip «Canceladas».
 *
 * `overdue` no filtra por estado sino por condición: reservas que aún retienen
 * plazas pese a haber pasado su plazo. El equipo las rechaza a mano desde aquí.
 */
const FILTROS: {
  clave: string;
  etiqueta: string;
  leyenda: string;
  estados: string[];
  overdue?: boolean;
  historical?: boolean;
}[] = [
  {
    clave: "revisar",
    etiqueta: "Por revisar",
    leyenda: "El cliente subió el comprobante y espera a que lo revises.",
    estados: ["proof_submitted"],
  },
  {
    clave: "vencidas",
    etiqueta: "Vencidas",
    leyenda:
      "Pasó el plazo de pago sin comprobante y siguen reteniendo plazas. Ábrelas y recházalas para liberar las plazas.",
    estados: [],
    overdue: true,
  },
  {
    clave: "pendientes",
    etiqueta: "Pendientes de pago",
    leyenda: "Plazas apartadas, aún sin comprobante de la transferencia.",
    estados: ["pending_payment"],
  },
  {
    clave: "confirmadas",
    etiqueta: "Confirmadas",
    leyenda: "Pago validado: el vuelo está reservado en firme.",
    estados: ["confirmed"],
  },
  {
    clave: "completadas",
    etiqueta: "Completadas",
    leyenda: "El vuelo ya se realizó.",
    estados: ["completed"],
  },
  {
    clave: "no-show",
    etiqueta: "No se presentó",
    leyenda: "Estaba confirmada pero el cliente no acudió; las plazas no se devuelven.",
    estados: ["no_show"],
  },
  {
    clave: "rechazadas",
    etiqueta: "Rechazadas",
    leyenda:
      "El equipo las descartó; plazas liberadas. Las rechazadas por impago llevan la nota interna «Venció el plazo para realizar el pago».",
    estados: ["rejected"],
  },
  {
    clave: "canceladas",
    etiqueta: "Canceladas",
    leyenda: "Anuladas por el equipo o por el cliente; las plazas se liberaron.",
    estados: ["cancelled_by_admin", "cancelled_by_customer"],
  },
  {
    clave: "historicas",
    etiqueta: "Históricas",
    leyenda: "Reservas anteriores al sistema, registradas a mano. Cuentan en los totales.",
    estados: [],
    historical: true,
  },
  {
    clave: "todas",
    etiqueta: "Todas",
    leyenda: "Todas las reservas, sin filtrar por estado.",
    estados: [],
  },
];

export default async function AdminReservasPage({ searchParams }: PageProps<"/admin/reservas">) {
  await requireAdmin();

  const { filtro } = await searchParams;
  const todas = FILTROS[FILTROS.length - 1];
  const activo = FILTROS.find((f) => f.clave === filtro) ?? todas;
  const reservas = activo.overdue
    ? await listOverdueBookings()
    : activo.historical
      ? (await listBookings([])).filter((r) => r.isHistorical)
      : await listBookings(activo.estados);

  const porRevisar = activo.clave === "revisar"
    ? reservas.length
    : (await listBookings(["proof_submitted"])).length;

  // Cuántas vencidas hay, para el aviso de arriba (y para no repetir consulta
  // cuando el filtro activo ya es el de vencidas).
  const vencidas = activo.overdue ? reservas.length : (await listOverdueBookings()).length;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Reservas</h1>
          <p className="adm-sub">
            {porRevisar === 0
              ? "No hay comprobantes esperando revisión."
              : `${porRevisar} ${porRevisar === 1 ? "comprobante espera" : "comprobantes esperan"} tu revisión.`}
          </p>
        </div>
        <div className="adm-actions">
          <Link href="/admin/reservas/historica" className="adm-btn adm-btn--ghost">
            + Reserva histórica
          </Link>
          <Link href="/admin/reservas/nueva" className="adm-btn adm-btn--primary">
            + Nueva reserva
          </Link>
        </div>
      </div>

      {vencidas > 0 && !activo.overdue && (
        <Link href="/admin/reservas?filtro=vencidas" className="adm-vencidas-aviso">
          ⚠ {vencidas} {vencidas === 1 ? "reserva vencida retiene" : "reservas vencidas retienen"}{" "}
          plazas sin pagar. Revísalas y recházalas para liberarlas →
        </Link>
      )}

      <div className="adm-filtros">
        {FILTROS.map((f) => (
          <Link
            key={f.clave}
            href={f.clave === "todas" ? "/admin/reservas" : `/admin/reservas?filtro=${f.clave}`}
            title={f.leyenda}
            className={`adm-chip${activo.clave === f.clave ? " adm-chip--on" : ""}`}
          >
            {f.etiqueta}
          </Link>
        ))}
      </div>

      <p className="adm-filtros__leyenda">
        <strong>{activo.etiqueta}:</strong> {activo.leyenda}
      </p>

      <BookingsTable reservas={reservas} vistaVencidas={Boolean(activo.overdue)} />
    </>
  );
}
