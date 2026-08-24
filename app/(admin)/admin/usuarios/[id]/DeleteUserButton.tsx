"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteUserAction } from "../../actions";
import type { FormState } from "../../actions";

function ConfirmSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="adm-btn adm-btn--danger"
      disabled={disabled || pending}
    >
      {pending ? "Eliminando…" : "Sí, eliminar definitivamente"}
    </button>
  );
}

/**
 * Botón de zona peligrosa: elimina al cliente y TODO lo asociado. Abre un aviso
 * que enumera lo que se va a borrar y exige marcar una casilla antes de permitir
 * la eliminación, para que nadie la dispare por accidente.
 */
export function DeleteUserButton({
  userId,
  userName,
  bookingsCount,
}: {
  userId: number;
  userName: string;
  bookingsCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [entendido, setEntendido] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(deleteUserAction, null);

  const reservasTexto =
    bookingsCount === 0
      ? "no tiene reservas"
      : `sus ${bookingsCount} ${bookingsCount === 1 ? "reserva" : "reservas"}`;

  return (
    <div className="adm-danger">
      <div className="adm-danger__head">
        <h2 className="adm-danger__title">Zona peligrosa</h2>
        <p className="adm-danger__desc">
          Eliminar este cliente borra también {reservasTexto}, sus comprobantes de pago, las fotos
          del vuelo y todos sus datos. No se puede deshacer.
        </p>
      </div>
      <button
        type="button"
        className="adm-btn adm-btn--danger"
        onClick={() => {
          setEntendido(false);
          setOpen(true);
        }}
      >
        Eliminar cliente
      </button>

      {open && (
        <div
          className="adm-modal__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-user-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="adm-modal">
            <h3 id="del-user-title" className="adm-modal__title">
              ¿Eliminar a {userName}?
            </h3>
            <p className="adm-modal__text">
              Se borrarán <strong>de forma permanente</strong> y no se podrán recuperar:
            </p>
            <ul className="adm-modal__list">
              <li>El cliente y todos sus datos personales.</li>
              <li>
                {bookingsCount === 0
                  ? "No tiene reservas."
                  : `Sus ${bookingsCount} ${bookingsCount === 1 ? "reserva" : "reservas"} (activas e históricas).`}
              </li>
              <li>Los comprobantes de pago y las fotos del vuelo (imágenes incluidas).</li>
            </ul>

            <label className="adm-modal__check">
              <input
                type="checkbox"
                checked={entendido}
                onChange={(e) => setEntendido(e.target.checked)}
              />
              <span>Entiendo que se borrará todo y no se puede deshacer.</span>
            </label>

            {state?.message && (
              <p className="adm-hint adm-hint--error" role="alert">
                {state.message}
              </p>
            )}

            <div className="adm-modal__actions">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <form action={formAction}>
                <input type="hidden" name="id" value={userId} />
                <ConfirmSubmit disabled={!entendido} />
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
