"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSettingsAction, type FormState } from "../actions";
import type { AdminSettings } from "@/lib/admin-api";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const [state, formAction] = useActionState<FormState, FormData>(saveSettingsAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="adm-form">
      {state?.message && (
        <p className={`adm-alert ${state.errors ? "adm-alert--error" : "adm-alert--ok"}`}>
          {state.message}
        </p>
      )}

      <section className="adm-card">
        <h2 className="adm-card__title">Acompañantes</h2>
        <p className="adm-hint">
          Personas que acompañan pero no vuelan. Entre semana, cada pasajero puede llevar un número
          de acompañantes gratis; el resto y todos los de fin de semana pagan la tarifa.
        </p>

        <div className="adm-grid">
          <label className="adm-field">
            <span>Tarifa por acompañante</span>
            <input
              name="companionFeeAmount"
              defaultValue={settings.companionFee.amount}
              placeholder="5"
              required
            />
            {errors.companionFeeAmount && (
              <span className="adm-hint adm-hint--error">{errors.companionFeeAmount}</span>
            )}
          </label>

          <label className="adm-field">
            <span>Moneda</span>
            <select name="companionFeeCurrency" defaultValue={settings.companionFee.currency}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </label>

          <label className="adm-field">
            <span>Gratis por pasajero (entre semana)</span>
            <input
              type="number"
              name="weekdayFreePerFlyer"
              min={0}
              defaultValue={settings.weekdayFreePerFlyer}
            />
            {errors.weekdayFreePerFlyer && (
              <span className="adm-hint adm-hint--error">{errors.weekdayFreePerFlyer}</span>
            )}
          </label>
        </div>
      </section>

      <div className="adm-actions">
        <SaveButton />
      </div>
    </form>
  );
}
