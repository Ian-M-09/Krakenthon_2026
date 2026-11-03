// Cliente HTTP de la Riot API. Todo lo que habla con Riot pasa por acá.
import "server-only";

const TIMEOUT_MS = 8000;
// Si Riot pide esperar más que esto, no lo hacemos: la función serverless quedaría colgada.
const MAX_ESPERA_REINTENTO_MS = 10_000;

export class RiotError extends Error {
  constructor(code, status, message) {
    super(message ?? code);
    this.name = "RiotError";
    this.code = code; // NOT_FOUND | RATE_LIMITED | KEY_INVALID | UNAVAILABLE
    this.status = status;
  }
}

// Mensajes para mostrar en la UI según el código de error.
export const MENSAJES_RIOT = {
  NOT_FOUND: "No encontramos esa cuenta en Riot. Revisá el nombre, el tag y la región.",
  RATE_LIMITED: "La API de Riot está saturada en este momento. Probá de nuevo en un minuto.",
  KEY_INVALID: "La conexión con Riot no está disponible ahora (key vencida). Avisale al admin.",
  UNAVAILABLE: "La API de Riot no responde. Probá de nuevo en unos minutos.",
};

// ---------------------------------------------------------------------------
// Rate limiter en memoria con ventanas deslizantes: 20 req/s y 100 req/2 min
// (límites de la dev/personal key). Ojo: en Vercel cada instancia tiene el suyo,
// por eso el respaldo real es manejar bien el 429.
// ---------------------------------------------------------------------------
const VENTANAS = [
  { ms: 1_000, max: 20 },
  { ms: 120_000, max: 100 },
];
const historial = []; // timestamps de las requests hechas

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarTurno() {
  for (;;) {
    const ahora = Date.now();
    // Descartamos lo que ya salió de la ventana más larga.
    while (historial.length && ahora - historial[0] >= VENTANAS[1].ms) historial.shift();

    let espera = 0;
    for (const { ms, max } of VENTANAS) {
      const enVentana = historial.filter((t) => ahora - t < ms);
      if (enVentana.length >= max) espera = Math.max(espera, enVentana[0] + ms - ahora);
    }
    if (espera === 0) {
      historial.push(ahora);
      return;
    }
    if (espera > MAX_ESPERA_REINTENTO_MS) {
      throw new RiotError("RATE_LIMITED", 429, "Límite local de requests alcanzado");
    }
    await dormir(espera);
  }
}

async function unIntento(url) {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new RiotError("KEY_INVALID", 401, "Falta RIOT_API_KEY");

  await esperarTurno();
  try {
    return await fetch(url, {
      headers: { "X-Riot-Token": key },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Timeout o error de red.
    throw new RiotError("UNAVAILABLE", 0, err?.message);
  }
}

// GET a la Riot API → JSON. Tira RiotError con un código tipado si algo falla.
export async function riotFetch(url) {
  let res = await unIntento(url);

  if (res.status === 429) {
    const segundos = Number(res.headers.get("Retry-After")) || 1;
    if (segundos * 1000 > MAX_ESPERA_REINTENTO_MS) throw new RiotError("RATE_LIMITED", 429);
    await dormir(segundos * 1000);
    res = await unIntento(url); // un solo reintento
  }

  if (res.ok) return res.json();

  const { status } = res;
  if (status === 429) throw new RiotError("RATE_LIMITED", status);
  if (status === 401 || status === 403) throw new RiotError("KEY_INVALID", status);
  // 400 llega con Riot IDs mal formados: para el usuario es lo mismo que "no existe".
  if (status === 404 || status === 400) throw new RiotError("NOT_FOUND", status);
  throw new RiotError("UNAVAILABLE", status);
}
