"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginCustomerAction, registerCustomerAction, type AccessState } from "./actions";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function LoginPane({ destino }: { destino: string }) {
  const [state, action] = useActionState<AccessState, FormData>(loginCustomerAction, null);

  return (
    <form action={action} className="acceso__form">
      <input type="hidden" name="volver" value={destino} />
      <Input label="Correo" type="email" name="email" autoComplete="username" required />
      <Input
        label="Contraseña"
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />
      <Link href="/recuperar" className="acceso__link">
        ¿Olvidaste tu contraseña?
      </Link>
      {state?.message && <p className="acceso__error">{state.message}</p>}
      <Submit label="Entrar" pendingLabel="Entrando…" />
    </form>
  );
}

function RegisterPane({ destino }: { destino: string }) {
  const [state, action] = useActionState<AccessState, FormData>(registerCustomerAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="acceso__form">
      <input type="hidden" name="volver" value={destino} />
      <Input
        label="Nombre y apellidos"
        name="fullName"
        autoComplete="name"
        error={errors.fullName}
      />
      <div className="acceso__fila">
        <Input label="Cédula" name="idNumber" placeholder="V-12345678" error={errors.idNumber} />
        <Input label="Teléfono" name="phone" autoComplete="tel" error={errors.phone} />
      </div>
      <Input
        label="Correo"
        type="email"
        name="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <div className="acceso__fila">
        <Input
          label="Contraseña"
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
      </div>
      {state?.message && <p className="acceso__error">{state.message}</p>}
      <Submit label="Crear cuenta" pendingLabel="Creando…" />
    </form>
  );
}

export function AccessForms({
  destino,
  startOn = "login",
}: {
  destino: string;
  startOn?: "login" | "register";
}) {
  const [pane, setPane] = useState<"login" | "register">(startOn);

  return (
    <div className="acceso__card">
      <div className="acceso__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pane === "login"}
          className={`acceso__tab${pane === "login" ? " acceso__tab--on" : ""}`}
          onClick={() => setPane("login")}
        >
          Ya tengo cuenta
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === "register"}
          className={`acceso__tab${pane === "register" ? " acceso__tab--on" : ""}`}
          onClick={() => setPane("register")}
        >
          Crear cuenta
        </button>
      </div>

      {pane === "login" ? <LoginPane destino={destino} /> : <RegisterPane destino={destino} />}
    </div>
  );
}
