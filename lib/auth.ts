import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BACKEND_URL } from "./api";

const COOKIE = "pbv_token";

export type Session = {
  id: number;
  email: string;
  fullName: string | null;
  idNumber: string | null;
  phone: string | null;
  roles: string[];
  isAdmin: boolean;
  displayName: string;
};

/**
 * El token vive en una cookie httpOnly y solo se lee en el servidor: nunca
 * llega al bundle del navegador, así que no es accesible desde JavaScript de
 * cliente ni queda expuesto en el HTML.
 */
export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function setToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Coincide con la caducidad del JWT de Symfony (1 h).
    maxAge: 60 * 60,
  });
}

export async function clearToken(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Quién ha iniciado sesión, o null. Clientes y administradores comparten cookie,
 * así que hay que mirar el rol y no solo si hay token: si no, una clienta con
 * sesión abierta entraría en el panel.
 */
export async function getSession(): Promise<Session | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { data: Session };
    return body.data;
  } catch {
    return null;
  }
}

/** Para las páginas del panel. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();

  if (!session) redirect("/admin/login");
  if (!session.isAdmin) redirect("/cuenta");

  return session;
}

/** Para el área privada del cliente. Un administrador también puede entrar. */
export async function requireCustomer(): Promise<Session> {
  const session = await getSession();

  if (!session) redirect("/acceder");

  return session;
}

type AuthResult = { ok: true; isAdmin: boolean } | { ok: false; error: string };

/** Intercambia credenciales por un token. */
export async function login(email: string, password: string): Promise<AuthResult> {
  let res: Response;

  try {
    res = await fetch(`${BACKEND_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "No se pudo contactar con el servidor." };
  }

  if (res.status === 401) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  if (res.status === 429) {
    return { ok: false, error: "Demasiados intentos. Prueba en unos minutos." };
  }

  if (!res.ok) {
    return { ok: false, error: `El servidor respondió ${res.status}.` };
  }

  const body = (await res.json()) as { token?: string };
  if (!body.token) {
    return { ok: false, error: "El servidor no devolvió un token." };
  }

  await setToken(body.token);

  const session = await getSession();
  return { ok: true, isAdmin: session?.isAdmin ?? false };
}

/** Alta de cliente. Deja la sesión iniciada. */
export async function register(input: {
  email: string;
  password: string;
  fullName?: string | null;
  idNumber?: string | null;
  phone?: string | null;
}): Promise<{ ok: true } | { ok: false; errors: Record<string, string> }> {
  let res: Response;

  try {
    res = await fetch(`${BACKEND_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { ok: false, errors: { _: "No se pudo contactar con el servidor." } };
  }

  if (res.status === 429) {
    return { ok: false, errors: { _: "Demasiados intentos. Prueba en unos minutos." } };
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (body && typeof body === "object" && "errors" in body) {
      return { ok: false, errors: body.errors as Record<string, string> };
    }
    const message =
      body && typeof body === "object" && "error" in body
        ? (body.error as { message?: string }).message
        : undefined;
    return { ok: false, errors: { _: message ?? `Error ${res.status}` } };
  }

  await setToken((body as { data: { token: string } }).data.token);
  return { ok: true };
}
