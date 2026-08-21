"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestResetAction, type AccessState } from "../acceder/actions";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Enviando…" : "Enviar enlace"}
    </Button>
  );
}

export function RecuperarForm() {
  const [state, action] = useActionState<AccessState, FormData>(requestResetAction, null);

  return (
    <form action={action} className="acceso__form">
      <Input label="Correo" type="email" name="email" autoComplete="email" required />
      {state?.message && (
        <p className={state.ok ? "cuenta__ok" : "acceso__error"}>{state.message}</p>
      )}
      <Submit />
    </form>
  );
}
