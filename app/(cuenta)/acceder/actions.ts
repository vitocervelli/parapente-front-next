"use server";

import { redirect } from "next/navigation";
import {
  clearToken,
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from "@/lib/auth";

export type AccessState = { errors?: Record<string, string>; message?: string; ok?: boolean } | null;

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

export async function requestResetAction(
  _prev: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { message: "Escribe tu correo." };
  }

  const result = await requestPasswordReset(email);
  if (!result.ok) {
    return { message: result.error };
  }

  // Neutro a propósito: no se confirma si el correo tiene o no cuenta.
  return {
    ok: true,
    message: "Si ese correo tiene una cuenta, te enviamos un enlace para recuperarla. Revisa tu bandeja (y el spam).",
  };
}

export async function resetPasswordAction(
  _prev: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("passwordRepeat") ?? "");

  if (!token) {
    return { message: "El enlace no es válido o ha caducado. Pide uno nuevo." };
  }
  if (password !== repeat) {
    return { errors: { passwordRepeat: "Las dos contraseñas no coinciden." } };
  }

  const result = await resetPassword(token, password);
  if (!result.ok) {
    return { message: result.error };
  }

  redirect("/acceder?restablecida=1");
}

export async function logoutCustomerAction(): Promise<void> {
  await clearToken();
  redirect("/acceder");
}
