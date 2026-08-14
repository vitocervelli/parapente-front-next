"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BACKEND_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type ProfileState = { errors?: Record<string, string>; message?: string; ok?: boolean } | null;

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const token = await getToken();
  if (!token) redirect("/acceder");

  const body = {
    fullName: String(formData.get("fullName") ?? "").trim() || null,
    idNumber: String(formData.get("idNumber") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  };

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/account/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { message: "No se pudo contactar con el servidor." };
  }

  if (res.status === 401 || res.status === 403) redirect("/acceder");

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    if (payload && typeof payload === "object" && "errors" in payload) {
      return { errors: payload.errors as Record<string, string> };
    }
    return { message: `El servidor respondió ${res.status}.` };
  }

  revalidatePath("/cuenta/perfil");
  revalidatePath("/cuenta");

  return { ok: true, message: "Datos guardados." };
}
