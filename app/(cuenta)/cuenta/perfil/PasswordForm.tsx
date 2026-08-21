"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, type ProfileState } from "./actions";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Guardando…" : "Cambiar contraseña"}
    </Button>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ProfileState, FormData>(changePasswordAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="cuenta__form">
      <Input
        label="Contraseña actual"
        type="password"
        name="current"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <div className="cuenta__fila">
        <Input
          label="Nueva contraseña"
          type="password"
          name="next"
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres"
          error={errors.newPassword}
        />
        <Input
          label="Repite la nueva"
          type="password"
          name="nextRepeat"
          autoComplete="new-password"
          required
          error={errors.nextRepeat}
        />
      </div>

      {state?.message && (
        <p className={state.ok ? "cuenta__ok" : "acceso__error"}>{state.message}</p>
      )}

      <Submit />
    </form>
  );
}
