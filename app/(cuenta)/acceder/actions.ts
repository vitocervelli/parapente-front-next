"use server";

import { redirect } from "next/navigation";
import { clearToken, login, register } from "@/lib/auth";

export type AccessState = { errors?: Record<string, string>; message?: string } | null;

/**
 * A dónde ir después de entrar. Solo se admiten rutas internas: aceptar una
 * URL completa permitiría usar el formulario para redirigir a otro sitio.
 */
function safeDestination(raw: FormDataEntryValue | null, fallback: string): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function loginCustomerAction(
  _prev: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Escribe tu correo y tu contraseña." };
  }

  const result = await login(email, password);
  if (!result.ok) {
    return { message: result.error };
  }

  // Un administrador que entra por aquí va a su panel.
  if (result.isAdmin) {
    redirect("/admin");
  }

  redirect(safeDestination(formData.get("volver"), "/cuenta"));
}

export async function registerCustomerAction(
  _prev: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("passwordRepeat") ?? "");

  if (password !== repeat) {
    return { errors: { passwordRepeat: "Las dos contraseñas no coinciden." } };
  }

  const result = await register({
    email: String(formData.get("email") ?? "").trim(),
    password,
    fullName: String(formData.get("fullName") ?? "").trim() || null,
    idNumber: String(formData.get("idNumber") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });

  if (!result.ok) {
    return { errors: result.errors, message: result.errors._ };
  }

  redirect(safeDestination(formData.get("volver"), "/cuenta"));
}

export async function logoutCustomerAction(): Promise<void> {
  await clearToken();
  redirect("/acceder");
}
