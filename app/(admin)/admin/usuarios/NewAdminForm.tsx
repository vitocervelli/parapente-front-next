"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAdminUserAction } from "../actions";
import type { FormState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="adm-btn adm-btn--primary" disabled={pending}>
      {pending ? "Creando…" : "Crear administrador"}
    </button>
  );
}

/**
 * Alta de una cuenta del equipo (administrador) con correo y contraseña. Abre un
 * formulario en un aviso modal; el backend valida el correo único y la longitud
 * mínima de la contraseña, y devuelve los errores por campo.
 */
export function NewAdminForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(createAdminUserAction, null);
  const errores = state?.errors ?? {};

  return (
    <>
      <button type="button" className="adm-btn adm-btn--primary" onClick={() => setOpen(true)}>
        + Nuevo administrador
      </button>

      {open && (
        <div
          className="adm-modal__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-admin-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="adm-modal">
            <h3 id="new-admin-title" className="adm-modal__title">
              Nuevo administrador
            </h3>
            <p className="adm-modal__text">
              Tendrá acceso completo al panel con este correo y contraseña. Comparte la contraseña
              por un canal seguro.
            </p>

            <form action={formAction} className="adm-form">
              <label className="adm-field">
                <span>Nombre y apellidos</span>
                <input type="text" name="fullName" autoComplete="name" />
                {errores.fullName && <span className="adm-hint adm-hint--error">{errores.fullName}</span>}
              </label>

              <label className="adm-field">
                <span>Correo *</span>
                <input type="email" name="email" required autoComplete="off" placeholder="nombre@equipo.com" />
                {errores.email && <span className="adm-hint adm-hint--error">{errores.email}</span>}
              </label>

              <label className="adm-field">
                <span>Teléfono</span>
                <input type="text" name="phone" autoComplete="off" />
                {errores.phone && <span className="adm-hint adm-hint--error">{errores.phone}</span>}
              </label>

              <label className="adm-field">
                <span>Contraseña * (mínimo 8 caracteres)</span>
                <input type="password" name="password" required minLength={8} autoComplete="new-password" />
                {errores.password && <span className="adm-hint adm-hint--error">{errores.password}</span>}
              </label>

              <div className="adm-modal__actions">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
