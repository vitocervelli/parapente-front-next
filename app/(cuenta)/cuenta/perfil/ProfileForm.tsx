"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveProfileAction, type ProfileState } from "./actions";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import type { Session } from "@/lib/auth";

function Submit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

export function ProfileForm({ session }: { session: Session }) {
  const [state, action] = useActionState<ProfileState, FormData>(saveProfileAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="cuenta__form">
      <Input
        label="Nombre y apellidos"
        name="fullName"
        defaultValue={session.fullName ?? ""}
        autoComplete="name"
        error={errors.fullName}
      />
      <div className="cuenta__fila">
        <Input
          label="Cédula"
          name="idNumber"
          defaultValue={session.idNumber ?? ""}
          placeholder="V-12345678"
          error={errors.idNumber}
        />
        <Input
          label="Teléfono"
          name="phone"
          defaultValue={session.phone ?? ""}
          autoComplete="tel"
          error={errors.phone}
        />
      </div>

      <Input
        label="Correo"
        defaultValue={session.email}
        disabled
        hint="El correo identifica tu cuenta y no se puede cambiar desde aquí."
      />

      {state?.message && (
        <p className={state.ok ? "cuenta__ok" : "acceso__error"}>{state.message}</p>
      )}

      <Submit />
    </form>
  );
}
