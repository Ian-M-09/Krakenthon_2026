"use client";

import { useSyncExternalStore } from "react";
import { convertirHorarios, DIAS_CORTOS } from "@/lib/horarios";

// La zona horaria del visitante solo se conoce en el navegador. En el servidor (y en el primer
// render) devolvemos null y mostramos los horarios en la zona del jugador; después se convierten.
const zonaDelNavegador = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const sinSuscripcion = () => () => {};

export default function HorariosVista({ horarios, zonaJugador, quien = "El jugador" }) {
  const zonaVisitante = useSyncExternalStore(sinSuscripcion, zonaDelNavegador, () => null);
  const zona = zonaVisitante ?? zonaJugador;

  if (!horarios?.length) return <p className="text-sm text-muted">Sin horarios cargados.</p>;

  const bloques = convertirHorarios(horarios, zonaJugador, zona);
  return (
    <div className="space-y-2">
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {bloques.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-10 text-muted">{DIAS_CORTOS[b.dia]}</span>
            <span>
              {b.desde} – {b.hasta}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {zonaVisitante && zonaVisitante !== zonaJugador
          ? `Convertido a tu zona horaria (${zona}). ${quien} los cargó en ${zonaJugador}.`
          : `Zona horaria: ${zona}`}
      </p>
    </div>
  );
}
