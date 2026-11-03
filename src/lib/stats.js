// Cálculo de stats a partir de las filas de `partidas_jugador` (docs/04-riot-api.md → Forma del resumen).
// Funciones puras: no importan nada de Next ni de Supabase, así se pueden testear (T25).

export const PARTIDAS_RESUMEN = 20;
export const MUESTRA_CHICA = 5;
const FORMA_N = 10;
const TOP_CAMPEONES = 5;

const redondear = (n, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;
const div = (a, b) => (b > 0 ? a / b : 0);
// KDA sobre los totales (no el promedio de los KDA de cada partida).
const kda = (k, d, a) => (k + a) / Math.max(1, d);

// Agrupa filas por una clave y devuelve { clave: filas[] }.
function agrupar(filas, clave) {
  const grupos = {};
  for (const f of filas) {
    const k = clave(f);
    if (k == null) continue;
    (grupos[k] ??= []).push(f);
  }
  return grupos;
}

function totales(filas) {
  return filas.reduce(
    (t, f) => ({
      victorias: t.victorias + (f.victoria ? 1 : 0),
      kills: t.kills + f.kills,
      deaths: t.deaths + f.deaths,
      assists: t.assists + f.assists,
      cs: t.cs + f.cs,
      vision: t.vision + f.vision,
      kp: t.kp + Number(f.participacion_kills ?? 0),
      minutos: t.minutos + f.duracion_seg / 60,
    }),
    { victorias: 0, kills: 0, deaths: 0, assists: 0, cs: 0, vision: 0, kp: 0, minutos: 0 }
  );
}

/**
 * filas: [{ campeon, campeon_id, posicion, victoria, kills, deaths, assists, cs, vision,
 *           participacion_kills, duracion_seg, inicio }]
 * Usa las PARTIDAS_RESUMEN más recientes. Devuelve el resumen que se guarda en
 * `estadisticas_jugador.resumen`.
 */
export function computeStats(filas) {
  const recientes = [...filas]
    .sort((a, b) => new Date(b.inicio) - new Date(a.inicio))
    .slice(0, PARTIDAS_RESUMEN);
  const n = recientes.length;
  const t = totales(recientes);

  const porRol = Object.entries(agrupar(recientes, (f) => f.posicion || null))
    .map(([posicion, fs]) => ({
      posicion,
      partidas: fs.length,
      winrate: redondear(div(totales(fs).victorias, fs.length), 3),
    }))
    .sort((a, b) => b.partidas - a.partidas);

  const porCampeon = Object.values(agrupar(recientes, (f) => f.campeon_id))
    .map((fs) => {
      const tc = totales(fs);
      return {
        campeon: fs[0].campeon,
        campeon_id: fs[0].campeon_id,
        partidas: fs.length,
        winrate: redondear(div(tc.victorias, fs.length), 3),
        kda: redondear(kda(tc.kills, tc.deaths, tc.assists)),
      };
    })
    .sort((a, b) => b.partidas - a.partidas || b.winrate - a.winrate)
    .slice(0, TOP_CAMPEONES);

  return {
    partidas: n,
    victorias: t.victorias,
    winrate: redondear(div(t.victorias, n), 3),
    kda: redondear(kda(t.kills, t.deaths, t.assists)),
    kills: redondear(div(t.kills, n), 1),
    deaths: redondear(div(t.deaths, n), 1),
    assists: redondear(div(t.assists, n), 1),
    cs_min: redondear(div(t.cs, t.minutos), 1),
    vision_min: redondear(div(t.vision, t.minutos), 2),
    kp: redondear(div(t.kp, n), 3),
    por_rol: porRol,
    por_campeon: porCampeon,
    // De la más reciente a la más vieja.
    forma_reciente: recientes.slice(0, FORMA_N).map((f) => (f.victoria ? "W" : "L")),
    rol_principal: porRol[0]?.posicion ?? null,
    muestra_chica: n < MUESTRA_CHICA,
    periodo: n
      ? { desde: recientes[n - 1].inicio, hasta: recientes[0].inicio }
      : null,
  };
}

// Métricas que se comparan contra `benchmarks_rango`. `mayorEsMejor` siempre es true acá.
export const METRICAS_BENCHMARK = [
  { clave: "kda", label: "KDA" },
  { clave: "cs_min", label: "CS/min" },
  { clave: "vision_min", label: "Visión/min" },
  { clave: "kp", label: "Kill participation", porcentaje: true },
];

// Elige el benchmark de la posición principal si existe y si no el de ALL.
export function elegirBenchmark(benchmarks, tier, posicion) {
  const delTier = benchmarks.filter((b) => b.tier === tier);
  return delTier.find((b) => b.posicion === posicion) ?? delTier.find((b) => b.posicion === "ALL") ?? null;
}

// → [{ clave, label, valor, referencia, diferencia }] con diferencia relativa (0.15 = 15% arriba).
export function compararConBenchmark(resumen, benchmark) {
  if (!benchmark) return [];
  return METRICAS_BENCHMARK.filter((m) => benchmark[m.clave] != null).map((m) => {
    const referencia = Number(benchmark[m.clave]);
    const valor = resumen[m.clave];
    return { ...m, valor, referencia, diferencia: redondear(div(valor - referencia, referencia), 3) };
  });
}
