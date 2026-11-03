// Lógica compartida de vinculación/verificación por ícono (docs/04-riot-api.md).
// Pura: no importa nada de Next ni de Supabase.
export const VERIFICACION_TTL_MS = 15 * 60 * 1000;
const ICONOS_BASE = 29; // 0..28: los íconos iniciales que tiene cualquier cuenta

// Ícono al azar entre los base, distinto del que tiene puesto ahora.
export function elegirIconoVerificacion(iconoActual) {
  let icono;
  do icono = Math.floor(Math.random() * ICONOS_BASE);
  while (icono === iconoActual);
  return icono;
}

// "K1RI4N #4388" → { gameName: "K1RI4N", tagLine: "4388" } o null si no tiene el formato.
export function parsearRiotId(texto) {
  const s = String(texto ?? "").trim();
  const i = s.lastIndexOf("#");
  if (i === -1) return null;
  const gameName = s.slice(0, i).trim();
  const tagLine = s.slice(i + 1).trim();
  if (gameName.length < 3 || gameName.length > 16) return null;
  if (tagLine.length < 2 || tagLine.length > 5) return null;
  return { gameName, tagLine };
}
