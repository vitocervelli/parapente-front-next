"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction, type AccessState } from "../acceder/actions";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Guardando…" : "Guardar contraseña"}
    </Button>
  );
}

export function RestablecerForm({ token }: { token: string }) {
  const [state, action] = useActionState<AccessState, FormData>(resetPasswordAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="acceso__form">
      <input type="hidden" name="token" value={token} />
      <Input
        label="Nueva contraseña"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres"
        error={errors.password}
      />
      <Input
        label="Repite la contraseña"
        type="password"
        name="passwordRepeat"
        autoComplete="new-password"
        required
        error={errors.passwordRepeat}
      />
      {state?.message && <p className="acceso__error">{state.message}</p>}
      <Submit />
    </form>
  );
}
