"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { crearHistoricaAction } from "../actions";
import { formatMoney } from "@/lib/booking";

/**
 * Alta de una reserva HISTÓRICA: una reserva anterior al sistema que el
 * administrador transcribe para dar continuidad a las cifras. No pasa por el
 * cupo ni el calendario: el servicio se escribe a mano, la fecha es libre y la
 * reserva nace completada (o no-show). Los pasajeros son opcionales.
 */
const HOY = new Date().toISOString().slice(0, 10);
const IMPORTE_RE = /^\d{1,8}([.,]\d{1,2})?$/;

export function HistoricaReservaForm() {
  // Cliente (se resuelve o crea la cuenta por su correo).
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  // Datos de la reserva.
  const [servicio, setServicio] = useState("");
  const [fecha, setFecha] = useState("");
  const [moneda, setMoneda] = useState<"EUR" | "USD">("EUR");
  const [importe, setImporte] = useState("");
  const [personas, setPersonas] = useState(1);
  const [estado, setEstado] = useState<"completed" | "no_show">("completed");
  const [pasajeros, setPasajeros] = useState<string[]>([]);
  const [nota, setNota] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<string | null>(null);
  const [enviando, startEnviar] = useTransition();

  const previsualImporte = useMemo(() => {
    if (!IMPORTE_RE.test(importe.trim())) return null;
    const centimos = Math.round(parseFloat(importe.trim().replace(",", ".")) * 100);
    return formatMoney(centimos, moneda);
  }, [importe, moneda]);

  function limpiar() {
    setEmail("");
    setNombre("");
    setTelefono("");
    setServicio("");
    setFecha("");
    setImporte("");
    setPersonas(1);
    setEstado("completed");
    setPasajeros([]);
    setNota("");
  }

  function crear() {
    setError(null);

    if (!email.trim()) {
      setError("Escribe el correo del cliente.");
      return;
    }
    if (!servicio.trim()) {
      setError("Escribe el nombre del servicio o la promoción.");
      return;
    }
    if (!fecha) {
      setError("Indica la fecha del vuelo.");
      return;
    }
    if (fecha > HOY) {
      setError("La fecha del vuelo no puede ser futura.");
      return;
    }
    if (!IMPORTE_RE.test(importe.trim())) {
      setError("El importe no tiene un formato válido (por ejemplo 120 o 120,50).");
      return;
    }
    if (personas < 1 || personas > 50) {
      setError("El número de personas debe estar entre 1 y 50.");
      return;
    }

    startEnviar(async () => {
      const result = await crearHistoricaAction({
        customer: {
          email: email.trim(),
          fullName: nombre.trim() || null,
          phone: telefono.trim() || null,
        },
        serviceName: servicio.trim(),
        flightDate: fecha,
        peopleCount: personas,
        amount: importe.trim(),
        currency: moneda,
        status: estado,
        note: nota.trim() || null,
        passengers: pasajeros.map((p) => p.trim()).filter(Boolean),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreada(result.reference);
    });
  }

  // ── Pantalla de confirmación ────────────────────────────────────────────
  if (creada) {
    return (
      <div className="adm-card" style={{ maxWidth: 520 }}>
        <h2 className="adm-card__title">Reserva histórica creada</h2>
        <p className="adm-sub" style={{ margin: 0 }}>
          Se registró la reserva <strong>{creada}</strong>. Ya cuenta en los totales del sistema.
        </p>
        <div className="adm-actions">
          <Link href="/admin/reservas" className="adm-btn adm-btn--primary">
            Ir a reservas
          </Link>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => {
              limpiar();
              setCreada(null);
            }}
          >
            Crear otra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-form adm-form--wide">
      {error && <p className="adm-alert adm-alert--error">{error}</p>}

      {/* Cliente */}
      <section className="adm-card">
        <h2 className="adm-card__title">Cliente</h2>
        <p className="adm-hint">
          Se busca la cuenta por el correo; si no existe, se crea una ficha de cliente.
        </p>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Correo *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@cliente.com"
            />
          </label>
          <label className="adm-field">
            <span>Nombre y apellidos</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Teléfono</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Reserva */}
      <section className="adm-card">
        <h2 className="adm-card__title">Reserva antigua</h2>
        <p className="adm-hint">
          El servicio se escribe tal cual fue: no tiene por qué coincidir con los del catálogo actual.
        </p>
        <div className="adm-grid">
          <label className="adm-field">
            <span>Servicio / promoción *</span>
            <input
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
              placeholder="Ej. Vuelo biplaza (temporada 2019)"
              maxLength={160}
            />
          </label>
          <label className="adm-field">
            <span>Fecha del vuelo *</span>
            <input
              type="date"
              value={fecha}
              max={HOY}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>Nº de personas *</span>
            <input
              type="number"
              min={1}
              max={50}
              value={personas}
              onChange={(e) => setPersonas(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="adm-field">
            <span>Moneda</span>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value === "USD" ? "USD" : "EUR")}>
              <option value="EUR">Euros (€)</option>
              <option value="USD">Dólares ($)</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Importe total *</span>
            <input
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="120,00"
              inputMode="decimal"
            />
            {previsualImporte && <span className="adm-hint">Se guardará como {previsualImporte}</span>}
          </label>
          <label className="adm-field">
            <span>Estado</span>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value === "no_show" ? "no_show" : "completed")}
            >
              <option value="completed">Completada (voló)</option>
              <option value="no_show">No se presentó</option>
            </select>
          </label>
        </div>
        <p className="adm-hint">
          Las completadas suman en el contador de personas voladas; las «no se presentó» no.
        </p>
      </section>

      {/* Pasajeros (opcionales) */}
      <section className="adm-card">
        <div className="adm-card__head">
          <h2 className="adm-card__title">Pasajeros (opcional)</h2>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => setPasajeros((p) => [...p, ""])}
          >
            Añadir pasajero
          </button>
        </div>
        <p className="adm-hint">
          Solo si conservas los nombres. No hace falta que coincidan con el nº de personas.
        </p>
        {pasajeros.length === 0 ? (
          <p className="adm-empty">Sin pasajeros anotados.</p>
        ) : (
          <div className="adm-grid">
            {pasajeros.map((nombrePasajero, i) => (
              <label className="adm-field" key={i}>
                <span>Pasajero {i + 1}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={nombrePasajero}
                    onChange={(e) =>
                      setPasajeros((p) => p.map((v, j) => (j === i ? e.target.value : v)))
                    }
                    placeholder="Nombre y apellidos"
                    maxLength={160}
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => setPasajeros((p) => p.filter((_, j) => j !== i))}
                    aria-label="Quitar pasajero"
                  >
                    ✕
                  </button>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Nota interna */}
      <section className="adm-card">
        <h2 className="adm-card__title">Nota interna</h2>
        <label className="adm-field">
          <span>Solo para el equipo</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="De dónde salió esta reserva, referencia antigua, etc."
          />
        </label>
      </section>

      <div className="adm-actions">
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          onClick={crear}
          disabled={enviando}
        >
          {enviando ? "Guardando…" : "Registrar reserva histórica"}
        </button>
        <Link href="/admin/reservas" className="adm-btn adm-btn--ghost">
          Cancelar
        </Link>
      </div>
    </div>
  );
}
