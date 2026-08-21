import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingsTable } from "../../reservas/BookingsTable";
import { getUser } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AdminUsuarioDetallePage({ params }: PageProps<"/admin/usuarios/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const detalle = await getUser(Number(id));
  if (!detalle) notFound();

  const { user, bookings } = detalle;

  return (
    <>
      <div className="adm-head">
        <div>
          <Link href="/admin/usuarios" className="adm-back">
            ← Clientes
          </Link>
          <h1 className="adm-title">{user.fullName ?? user.email}</h1>
          <p className="adm-sub">
            {user.bookingsCount === 0
              ? "Este cliente no tiene reservas todavía."
              : `${user.bookingsCount} ${user.bookingsCount === 1 ? "reserva" : "reservas"} en total.`}
          </p>
        </div>
      </div>

      <dl className="adm-datos">
        <div>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{user.phone ?? "—"}</dd>
        </div>
        <div>
          <dt>Cédula</dt>
          <dd>{user.idNumber ?? "—"}</dd>
        </div>
        <div>
          <dt>Alta</dt>
          <dd>{formatFecha(user.createdAt)}</dd>
        </div>
      </dl>

      {bookings.length > 0 && <BookingsTable reservas={bookings} vistaVencidas={false} />}
    </>
  );
}
