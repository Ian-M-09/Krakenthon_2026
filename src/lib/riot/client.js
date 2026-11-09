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
  KEY_INVALID: "La conexión con Riot no está disponible ahora (clave rechazada). Avisale al admin.",
  UNAVAILABLE: "La API de Riot no responde. Probá de nuevo en unos minutos.",
};

// ---------------------------------------------------------------------------
// Rate limiter en memoria con ventanas deslizantes. Los límites NO están fijos en el código:
// se leen de los headers que Riot manda en cada respuesta.
//   X-App-Rate-Limit: "100:120,20:1"   → límite de la key por host (americas, la2...)
//   X-Method-Rate-Limit: "2000:10"      → límite de cada endpoint por host
//   X-*-Rate-Limit-Count: "3:120,1:1"   → lo que Riot ya nos contó (incluye otras instancias)
// Hay un "bucket" de la app por host y uno por método. Antes de cada request se espera a que
// todos tengan lugar. En Vercel cada instancia tiene su memoria, pero el Count de Riot las
// sincroniza, y el respaldo final sigue siendo el manejo del 429.
// ---------------------------------------------------------------------------
// Hasta la primera respuesta (instancia recién levantada) usamos valores conservadores.
const LIMITE_APP_INICIAL = "20:1,100:120";

const buckets = new Map(); // clave → { ventanas: [{ max, ms }], historial: [timestamps] }

// "100:120,20:1" → [{ max: 100, ms: 120000 }, { max: 20, ms: 1000 }]
export function parsearLimites(header) {
  return String(header ?? "")
    .split(",")
    .map((par) => par.trim().split(":").map(Number))
    .filter(([max, seg]) => max > 0 && seg > 0)
    .map(([max, seg]) => ({ max, ms: seg * 1000 }));
}

function bucket(clave, limiteInicial) {
  if (!buckets.has(clave)) {
    buckets.set(clave, { ventanas: parsearLimites(limiteInicial), historial: [] });
  }
  return buckets.get(clave);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Cuánto hay que esperar para que este bucket tenga lugar (0 = ya).
function esperaDe(b, ahora) {
  const ventanaMax = Math.max(0, ...b.ventanas.map((v) => v.ms));
  while (b.historial.length && ahora - b.historial[0] >= ventanaMax) b.historial.shift();
  let espera = 0;
  for (const { ms, max } of b.ventanas) {
    const enVentana = b.historial.filter((t) => ahora - t < ms);
    if (enVentana.length >= max) espera = Math.max(espera, enVentana[enVentana.length - max] + ms - ahora);
  }
  return espera;
}

async function esperarTurno(lista) {
  for (;;) {
    const ahora = Date.now();
    const espera = Math.max(...lista.map((b) => esperaDe(b, ahora)));
    if (espera === 0) {
      lista.forEach((b) => b.historial.push(ahora)); // reservamos el lugar en todos
      return;
    }
    if (espera > MAX_ESPERA_REINTENTO_MS) {
      throw new RiotError("RATE_LIMITED", 429, "Límite de requests alcanzado");
    }
    await dormir(espera);
  }
}

// Actualiza un bucket con lo que dijo Riot: las ventanas reales y, si Riot contó más requests
// de las que vimos acá (otra instancia de Vercel usó la key), sumamos la diferencia.
function aprenderDe(b, limiteHeader, countHeader) {
  const ventanas = parsearLimites(limiteHeader);
  if (ventanas.length) b.ventanas = ventanas;
  const ahora = Date.now();
  for (const { max: usadas, ms } of parsearLimites(countHeader)) {
    const locales = b.historial.filter((t) => ahora - t < ms).length;
    for (let i = locales; i < usadas; i++) b.historial.push(ahora);
  }
  b.historial.sort((x, y) => x - y);
}

// Recorta espacios, saltos de línea y comillas que se cuelan al pegar la key en Vercel.
const leerKey = () => (process.env.RIOT_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");

async function unIntento(url, metodo) {
  const key = leerKey();
  if (!key) {
    console.error("[riot] Falta RIOT_API_KEY en este entorno (¿se redeployó después de cargarla?)");
    throw new RiotError("KEY_INVALID", 401, "Falta RIOT_API_KEY");
  }

  const { host } = new URL(url);
  const app = bucket(`app:${host}`, LIMITE_APP_INICIAL);
  const met = bucket(`metodo:${host}:${metodo}`, ""); // sin límite hasta que Riot lo informe
  await esperarTurno([app, met]);

  let res;
  try {
    res = await fetch(url, {
      headers: { "X-Riot-Token": key },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Timeout o error de red.
    throw new RiotError("UNAVAILABLE", 0, err?.message);
  }
  aprenderDe(app, res.headers.get("X-App-Rate-Limit"), res.headers.get("X-App-Rate-Limit-Count"));
  aprenderDe(met, res.headers.get("X-Method-Rate-Limit"), res.headers.get("X-Method-Rate-Limit-Count"));
  return res;
}

// GET a la Riot API → JSON. Tira RiotError con un código tipado si algo falla.
// `metodo`: nombre del endpoint (lo pasa endpoints.js) para su límite propio.
export async function riotFetch(url, metodo = new URL(url).pathname) {
  let res = await unIntento(url, metodo);

  if (res.status === 429) {
    const segundos = Number(res.headers.get("Retry-After")) || 1;
    console.warn(
      `[riot] 429 (${res.headers.get("X-Rate-Limit-Type") ?? "?"}) en ${metodo}, Retry-After=${segundos}s`
    );
    if (segundos * 1000 > MAX_ESPERA_REINTENTO_MS) throw new RiotError("RATE_LIMITED", 429);
    await dormir(segundos * 1000);
    res = await unIntento(url, metodo); // un solo reintento
  }

  if (res.ok) return res.json();

  const { status } = res;
  if (status === 429) throw new RiotError("RATE_LIMITED", status);
  if (status === 401 || status === 403) {
    // Diagnóstico para los logs de Vercel (sin imprimir la key): una key válida mide 42 y empieza con RGAPI-.
    const key = leerKey();
    console.error(
      `[riot] ${status} en ${new URL(url).pathname} · key largo=${key.length} prefijo_ok=${key.startsWith("RGAPI-")}`
    );
    throw new RiotError("KEY_INVALID", status);
  }
  // 400 llega con Riot IDs mal formados: para el usuario es lo mismo que "no existe".
  if (status === 404 || status === 400) throw new RiotError("NOT_FOUND", status);
  throw new RiotError("UNAVAILABLE", status);
}
