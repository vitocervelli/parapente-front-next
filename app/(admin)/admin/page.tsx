import { redirect } from "next/navigation";

/**
 * La portada del panel es la bandeja de reservas: es lo que el equipo mira a
 * diario. El catálogo vive en /admin/servicios.
 */
export default function AdminHome() {
  redirect("/admin/reservas");
}
