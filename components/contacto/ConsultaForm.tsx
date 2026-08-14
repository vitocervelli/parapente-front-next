"use client";

import { useState } from "react";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ds/Input";
import { Select } from "@/components/ds/Select";
import { waDigits } from "@/lib/site";

const TEMA_GENERAL = "Información general";

/** Si el catálogo no llega, el formulario sigue siendo usable. */
const TEMAS_FALLBACK = [TEMA_GENERAL, "Vuelo en parapente"];

/** Si las localidades no llegan, el selector de zona sigue teniendo opciones. */
const CIUDADES_FALLBACK = ["Nirgua", "La Guaira", "Mérida", "Todavía no lo sé"];

/**
 * Formulario de consultas: recoge la duda y abre WhatsApp con el mensaje ya
 * redactado. No reserva nada — para eso está la página de reserva.
 */
export function ConsultaForm({
  experiencias,
  ciudades,
}: {
  experiencias?: string[];
  ciudades?: string[];
}) {
  const temas = experiencias?.length ? [TEMA_GENERAL, ...experiencias] : TEMAS_FALLBACK;
  const zonas = ciudades?.length ? ciudades : CIUDADES_FALLBACK;

  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState(zonas[0]);
  const [tema, setTema] = useState(temas[0]);
  const [mensaje, setMensaje] = useState("");
  const [enviado, setEnviado] = useState(false);

  const faltaNombre = enviado && !nombre.trim();
  const faltaMensaje = enviado && !mensaje.trim();

  const enviar = () => {
    setEnviado(true);
    if (!nombre.trim() || !mensaje.trim()) return;

    const sobre = tema === TEMA_GENERAL ? "" : ` sobre ${tema}`;
    const donde = ciudad === "Todavía no lo sé" ? "" : ` en ${ciudad}`;
    const msg = `Hola! Soy ${nombre.trim()} y tengo una consulta${sobre}${donde}: ${mensaje.trim()}`;

    window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="consulta__form">
      <div className="consulta__form-title">¿Tienes dudas?</div>
      <p className="consulta__form-intro">
        Escríbenos lo que quieras saber — condiciones de vuelo, grupos, accesibilidad, cómo llegar…
        Te respondemos por WhatsApp.
      </p>

      <div className="consulta__fields">
        <Input
          label="Tu nombre"
          placeholder="¿Cómo te llamas?"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={faltaNombre ? "Escribe tu nombre" : undefined}
        />
        <Select
          label="Zona de vuelo"
          options={zonas}
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
        />
        <Select
          label="¿Sobre qué preguntas?"
          options={temas}
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />
      </div>

      <Input
        multiline
        label="Tu consulta"
        rows={4}
        placeholder="Cuéntanos qué necesitas saber…"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        error={faltaMensaje ? "Escribe tu consulta" : undefined}
      />

      <div className="consulta__footer">
        <span className="consulta__note">
          Al enviar se abre WhatsApp con tu consulta lista — solo dale enviar.
        </span>
        <Button size="md" onClick={enviar}>
          Enviar por WhatsApp
        </Button>
      </div>
    </div>
  );
}
