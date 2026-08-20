"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type FormState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="adm-btn adm-btn--primary adm-login__entrar" disabled={pending}>
      {pending ? "Entrando…" : "Entrar al panel"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<FormState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="adm-form">
      <label className="adm-field">
        <span>Correo</span>
        <input type="email" name="email" autoComplete="username" required autoFocus />
      </label>
      <label className="adm-field">
        <span>Contraseña</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.message && <p className="adm-alert adm-alert--error">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}
