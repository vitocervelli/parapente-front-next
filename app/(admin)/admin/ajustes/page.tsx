import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";
import { getAdminSettings, UnauthorizedError } from "@/lib/admin-api";
import { requireAdmin } from "@/lib/auth";

export default async function AjustesPage() {
  await requireAdmin();

  let settings;
  try {
    settings = await getAdminSettings();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }

  if (!settings) {
    settings = {
      companionFee: { amount: "5.00", currency: "EUR" as const, display: "5€" },
      weekdayFreePerFlyer: 1,
    };
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Ajustes</h1>
          <p className="adm-sub">Reglas globales de la reserva.</p>
        </div>
      </div>
      <SettingsForm settings={settings} />
    </>
  );
}
