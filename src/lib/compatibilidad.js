// Compatibilidad jugador ↔ equipo, 0-100 (T18, docs/05-ia-gemini.md → 3). SIN LLM:
// determinística, explicable e instantánea. La UI muestra el desglose de cada criterio.
// Función pura: no importa nada de Next ni de Supabase.
import { indiceDivision } from "./rangos";
import { aIntervalosUTC, minutosSuperpuestos } from "./horarios";

export const PESOS = { rol: 35, rango: 25, idioma: 20, horario: 20 };

function puntajeRol(jugador, equipo) {
  const buscados = equipo.roles_buscados ?? [];
  if (!buscados.length) return { puntos: 15, detalle: "El equipo no especificó roles" };
  const juega = new Set([...(jugador.roles ?? []), jugador.rol_principal].filter(Boolean));
  const match = buscados.filter((r) => juega.has(r));
  return match.length
    ? { puntos: PESOS.rol, detalle: "Juega un rol que el equipo busca", roles: match }
    : { puntos: 0, detalle: "No juega los roles que busca el equipo" };
}

function puntajeRango(jugador, equipo) {
  if (!equipo.rango_minimo) return { puntos: PESOS.rango, detalle: "El equipo no pide rango mínimo" };
  const actual = indiceDivision(jugador.rango_tier, jugador.rango_division);
  if (actual == null) return { puntos: 12, detalle: "El jugador no tiene rango este split" };
  const minimo = indiceDivision(equipo.rango_minimo, "IV");
  if (actual >= minimo) return { puntos: PESOS.rango, detalle: "Cumple el rango mínimo" };
  const divisiones = minimo - actual;
  return {
    puntos: Math.max(0, PESOS.rango - 5 * divisiones),
    detalle: `Está ${divisiones} ${divisiones === 1 ? "división" : "divisiones"} por debajo del mínimo`,
  };
}

function puntajeIdioma(jugador, equipo) {
  const a = jugador.idiomas ?? [];
  const b = equipo.idiomas ?? [];
  if (!a.length || !b.length) return { puntos: 10, detalle: "Falta el dato de idioma" };
  return b.some((i) => a.includes(i))
    ? { puntos: PESOS.idioma, detalle: "Comparten idioma" }
    : { puntos: 0, detalle: "No comparten idioma" };
}

function puntajeHorario(jugador, equipo, fecha) {
  if (!jugador.horarios?.length || !equipo.horarios?.length) {
    return { puntos: 10, detalle: "Falta el dato de horarios" };
  }
  const ivEquipo = aIntervalosUTC(equipo.horarios, equipo.zona_horaria, fecha);
  const ivJugador = aIntervalosUTC(jugador.horarios, jugador.zona_horaria, fecha);
  const minutosEquipo = ivEquipo.reduce((t, iv) => t + (iv.fin - iv.inicio), 0);
  const comunes = minutosSuperpuestos(ivJugador, ivEquipo);
  const ratio = minutosEquipo ? Math.min(1, comunes / minutosEquipo) : 0;
  return {
    puntos: Math.round(PESOS.horario * ratio),
    detalle: `Coinciden ${Math.round(comunes / 60)} h de las ${Math.round(minutosEquipo / 60)} h semanales del equipo`,
  };
}

/**
 * jugador: { roles, rol_principal, rango_tier, rango_division, idiomas, horarios, zona_horaria }
 * equipo:  { roles_buscados, rango_minimo, idiomas, horarios, zona_horaria }
 * → { total, desglose: [{ clave, label, puntos, max, detalle }] }
 */
export function calcularCompatibilidad(jugador, equipo, fecha = new Date()) {
  const desglose = [
    { clave: "rol", label: "Rol", ...puntajeRol(jugador, equipo) },
    { clave: "rango", label: "Rango", ...puntajeRango(jugador, equipo) },
    { clave: "idioma", label: "Idioma", ...puntajeIdioma(jugador, equipo) },
    { clave: "horario", label: "Horario", ...puntajeHorario(jugador, equipo, fecha) },
  ].map((d) => ({ ...d, max: PESOS[d.clave] }));

  return { total: desglose.reduce((t, d) => t + d.puntos, 0), desglose };
}
