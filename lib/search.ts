// Búsqueda instantánea de los listados del panel (clientes, embajadores…).
// Sin dependencias: vale en componentes cliente.

/** Minúsculas y sin tildes: "Pérez" encuentra "perez" y al revés. */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Todo lo buscable de un registro, en un solo texto normalizado. */
export function pajar(partes: (string | number | null | undefined)[]): string {
  return normalizar(partes.filter((p) => p !== null && p !== undefined && p !== "").join(" "));
}

/** Cada palabra de la búsqueda tiene que aparecer en el pajar (en cualquier orden). */
export function coincide(heno: string, busqueda: string): boolean {
  const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
  return terminos.every((t) => heno.includes(t));
}
