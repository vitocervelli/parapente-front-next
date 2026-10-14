"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import { COLABORACIONES, NICHOS, REDES, enviarSolicitudEmbajador } from "@/lib/embajadores";

const MAX_REDES = 10;

type Fila = { id: number; network: string; url: string; followers: string };

/** Chips de selección múltiple (nicho, tipo de colaboración). */
function Chips({
  opciones,
  seleccion,
  onToggle,
}: {
  opciones: readonly { key: string; label: string }[];
  seleccion: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="emb-chips">
      {opciones.map((o) => {
        const on = seleccion.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            className={`emb-chip${on ? " emb-chip--on" : ""}`}
            aria-pressed={on}
            onClick={() => onToggle(o.key)}
          >
            {on ? "✓ " : ""}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Formulario de embajadores: datos de contacto, redes con su enlace y
 * seguidores, temática, tipo de colaboración y comentarios. Es controlado para
 * no perder nada si el servidor devuelve errores.
 */
export function EmbajadoresForm() {
  const siguienteId = useRef(1);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [redes, setRedes] = useState<Fila[]>([
    { id: 0, network: "instagram", url: "", followers: "" },
  ]);
  const [niches, setNiches] = useState<string[]>([]);
  const [collabs, setCollabs] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  /** Al corregir un campo, su error desaparece sin esperar a reenviar. */
  const limpiar = (campo: string) =>
    setErrors((prev) => {
      if (!(campo in prev)) return prev;
      const siguiente = { ...prev };
      delete siguiente[campo];
      return siguiente;
    });

  const toggle = (lista: string[], set: (v: string[]) => void, key: string) =>
    set(lista.includes(key) ? lista.filter((k) => k !== key) : [...lista, key]);

  const cambiarRed = (id: number, campo: keyof Omit<Fila, "id">, valor: string) => {
    limpiar("socials");
    setRedes((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const anadirRed = () => {
    // Propone una red que aún no esté en la lista.
    const usadas = new Set(redes.map((r) => r.network));
    const libre = REDES.find((r) => r.key !== "other" && !usadas.has(r.key))?.key ?? "other";
    setRedes((prev) => [
      ...prev,
      { id: siguienteId.current++, network: libre, url: "", followers: "" },
    ]);
  };

  /** Comprobaciones básicas antes de ir al servidor (que valida de nuevo). */
  function validarLocal(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Escribe tu nombre.";
    if (!lastName.trim()) e.lastName = "Escribe tus apellidos.";
    const edad = Number(age);
    if (!age.trim()) e.age = "Indica tu edad.";
    else if (!Number.isInteger(edad) || edad < 16 || edad > 99)
      e.age = "La edad debe estar entre 16 y 99 años.";
    if (!email.trim()) e.email = "Escribe tu correo.";
    if (!phone.trim()) e.phone = "Escribe un teléfono de contacto.";
    if (!redes.some((r) => r.url.trim()))
      e.socials = "Añade al menos una red social con el enlace a tu perfil.";
    if (!consent) e.consent = "Necesitamos tu permiso para guardar tus datos y contactarte.";
    return e;
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    setMessage(null);

    const locales = validarLocal();
    setErrors(locales);
    if (Object.keys(locales).length > 0) {
      setMessage("Revisa los campos marcados en rojo.");
      return;
    }

    startTransition(async () => {
      const result = await enviarSolicitudEmbajador({
        firstName,
        lastName,
        age,
        email,
        phone,
        city,
        country,
        socials: redes
          .filter((r) => r.url.trim())
          .map(({ network, url, followers }) => ({
            network,
            url: url.trim(),
            followers: followers.trim(),
          })),
        niches,
        collaborationTypes: collabs,
        comments,
        consent,
        website,
      });

      if (result.ok) {
        setEnviado(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setErrors(result.errors ?? {});
      setMessage(result.message ?? "Revisa los campos marcados en rojo.");
    });
  }

  if (enviado) {
    return (
      <div className="consulta__form emb-gracias">
        <span className="emb-gracias__icono" aria-hidden="true">
          ✓
        </span>
        <div className="consulta__form-title">¡Gracias, {firstName.trim()}!</div>
        <p className="consulta__form-intro">
          Recibimos tu solicitud. Revisaremos tu perfil con calma y, si encaja con lo que buscamos,
          te escribiremos al correo o al teléfono que nos dejaste.
        </p>
        <p className="emb-gracias__nos-vemos">Nos vemos en el aire.</p>
      </div>
    );
  }

  return (
    <form className="consulta__form" onSubmit={enviar} noValidate>
      <div className="consulta__form-title">Quiero ser embajador</div>
      <p className="consulta__form-intro">
        Cuéntanos quién eres y dónde publicas. Los campos con * son obligatorios.
      </p>

      {/* Campo trampa: oculto para las personas, los bots lo rellenan. */}
      <div className="emb-hp" aria-hidden="true">
        <label>
          No rellenar
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <h3 className="emb-subtitle">Sobre ti</h3>
      <div className="consulta__fields">
        <Input
          label="Nombre *"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            limpiar("firstName");
          }}
          error={errors.firstName}
        />
        <Input
          label="Apellidos *"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            limpiar("lastName");
          }}
          error={errors.lastName}
        />
        <Input
          label="Edad *"
          type="number"
          inputMode="numeric"
          min={16}
          max={99}
          value={age}
          onChange={(e) => {
            setAge(e.target.value);
            limpiar("age");
          }}
          error={errors.age}
        />
        <Input
          label="Teléfono *"
          type="tel"
          autoComplete="tel"
          placeholder="+58 412 000 0000"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            limpiar("phone");
          }}
          error={errors.phone}
        />
        <Input
          label="Correo *"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            limpiar("email");
          }}
          error={errors.email}
        />
        <Input
          label="Ciudad"
          autoComplete="address-level2"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <Input
          label="País"
          autoComplete="country-name"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
      </div>

      <h3 className="emb-subtitle">Tus redes *</h3>
      <p className="emb-help">
        Pega el enlace a tu perfil y, si quieres, tus seguidores aproximados (por ejemplo «12k»).
      </p>
      <div className="emb-redes">
        {redes.map((r, i) => {
          const red = REDES.find((x) => x.key === r.network) ?? REDES[REDES.length - 1];
          return (
            <div key={r.id} className="emb-red">
              <label className="pbv-select emb-red__red">
                <span className="pbv-field__label">Red</span>
                <select
                  value={r.network}
                  onChange={(e) => cambiarRed(r.id, "network", e.target.value)}
                >
                  {REDES.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="pbv-select__chev" />
              </label>
              <Input
                label="Enlace al perfil"
                type="url"
                inputMode="url"
                placeholder={red.placeholder}
                value={r.url}
                onChange={(e) => cambiarRed(r.id, "url", e.target.value)}
              />
              <Input
                label="Seguidores"
                inputMode="text"
                placeholder="12k"
                value={r.followers}
                onChange={(e) => cambiarRed(r.id, "followers", e.target.value)}
              />
              {redes.length > 1 && (
                <button
                  type="button"
                  className="emb-red__quitar"
                  aria-label={`Quitar la red ${i + 1}`}
                  title="Quitar"
                  onClick={() => setRedes((prev) => prev.filter((x) => x.id !== r.id))}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
      {errors.socials && <p className="emb-error">{errors.socials}</p>}
      {redes.length < MAX_REDES && (
        <button type="button" className="emb-anadir" onClick={anadirRed}>
          + Añadir otra red
        </button>
      )}

      <h3 className="emb-subtitle">Tu contenido</h3>
      <div className="emb-grupo">
        <span className="pbv-field__label">¿De qué va tu contenido?</span>
        <Chips
          opciones={NICHOS}
          seleccion={niches}
          onToggle={(k) => toggle(niches, setNiches, k)}
        />
      </div>
      <div className="emb-grupo">
        <span className="pbv-field__label">¿Qué tipo de colaboración te interesa?</span>
        <Chips
          opciones={COLABORACIONES}
          seleccion={collabs}
          onToggle={(k) => toggle(collabs, setCollabs, k)}
        />
      </div>

      <Input
        multiline
        label="Comentarios"
        rows={4}
        maxLength={2000}
        placeholder="Cuéntanos qué te gustaría hacer con nosotros, ideas de contenido, fechas…"
        value={comments}
        onChange={(e) => {
          setComments(e.target.value);
          limpiar("comments");
        }}
        error={errors.comments}
      />

      <label className={`emb-consent${errors.consent ? " emb-consent--error" : ""}`}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            limpiar("consent");
          }}
        />
        <span>
          Acepto que Parapente Bella Vista guarde estos datos para contactarme sobre posibles
          colaboraciones. *
        </span>
      </label>
      {errors.consent && <p className="emb-error">{errors.consent}</p>}

      {message && <p className="acceso__error">{message}</p>}

      <div className="consulta__footer">
        <span className="consulta__note">
          Solo usaremos tus datos para hablar contigo de colaboraciones.
        </span>
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
