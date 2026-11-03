// Sincroniza una cuenta con Riot: rango + solo las partidas nuevas (docs/04-riot-api.md).
// Escribe con la service role: el jugador nunca puede tocar estas tablas.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RiotError, MENSAJES_RIOT } from "./client";
import { getSummonerByPuuid, getRankedSolo, getMatchIds, getMatch } from "./endpoints";
import { rangoValor } from "@/lib/rangos";
import { computeStats } from "@/lib/stats";

// Recalcula el resumen desde lo guardado en la BD (sin llamar a Riot) y lo guarda.
// Trae todas las filas del puuid y computeStats se queda con las 20 más recientes.
export async function recalcularStats(db, cuentaId, puuid) {
  const { data, error } = await db
    .from("partidas_jugador")
    .select(
      "campeon, campeon_id, posicion, victoria, kills, deaths, assists, cs, vision, participacion_kills, partidas!inner(inicio, duracion_seg)"
    )
    .eq("puuid", puuid);
  if (error) throw error;

  const filas = data.map(({ partidas, ...f }) => ({ ...f, ...partidas }));
  const resumen = computeStats(filas);
  const { error: errS } = await db.from("estadisticas_jugador").upsert(
    {
      cuenta_id: cuentaId,
      resumen,
      partidas_n: resumen.partidas,
      calculado_en: new Date().toISOString(),
    },
    { onConflict: "cuenta_id" }
  );
  if (errS) throw errS;
  return resumen;
}

// Si la cuenta nunca tuvo stats calculadas, las calcula con lo que haya en caché.
async function asegurarStats(db, cuenta) {
  const { data } = await db
    .from("estadisticas_jugador")
    .select("cuenta_id")
    .eq("cuenta_id", cuenta.id)
    .maybeSingle();
  if (!data) await recalcularStats(db, cuenta.id, cuenta.puuid);
}

export const COOLDOWN_MS = 10 * 60 * 1000;
const PARTIDAS_A_TRAER = 20;
const TANDA = 5; // partidas en paralelo (el limiter igual respeta los 20 req/s)

// Fila de partidas_jugador para nuestro puuid, o null si es remake o no jugó.
export function extraerParticipacion(match, puuid) {
  const { info, metadata } = match;
  const p = info.participants.find((x) => x.puuid === puuid);
  if (!p) return null;
  if (info.gameDuration < 300 || p.gameEndedInEarlySurrender) return null; // remake

  const killsEquipo = info.participants
    .filter((x) => x.teamId === p.teamId)
    .reduce((acc, x) => acc + x.kills, 0);

  return {
    match_id: metadata.matchId,
    puuid,
    campeon_id: p.championId,
    campeon: p.championName,
    posicion: p.teamPosition || null,
    victoria: p.win,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: p.totalMinionsKilled + p.neutralMinionsKilled,
    vision: p.visionScore,
    oro: p.goldEarned,
    danio_campeones: p.totalDamageDealtToChampions,
    participacion_kills:
      killsEquipo === 0 ? 0 : Math.round(((p.kills + p.assists) / killsEquipo) * 1000) / 1000,
  };
}

function filaPartida(match, plataforma) {
  const { info, metadata } = match;
  return {
    match_id: metadata.matchId,
    plataforma,
    cola: info.queueId,
    inicio: new Date(info.gameStartTimestamp).toISOString(),
    duracion_seg: info.gameDuration,
    version: info.gameVersion,
    datos: match,
  };
}

// Resultado: { estado: "actualizado" | "cooldown" | "stale", nuevas, sincronizado_en, mensaje? }
export async function syncAccount(cuentaId, { force = false } = {}) {
  const db = createAdminClient();
  const { data: cuenta, error } = await db
    .from("cuentas_riot")
    .select("id, puuid, plataforma, sincronizado_en")
    .eq("id", cuentaId)
    .single();
  if (error) throw error;

  const cacheado = (estado, mensaje) => ({
    estado,
    nuevas: 0,
    sincronizado_en: cuenta.sincronizado_en,
    mensaje,
  });

  if (process.env.DEMO_MODE === "true") {
    await asegurarStats(db, cuenta);
    return cacheado("stale", "Mostrando datos guardados (modo demo).");
  }
  const ultima = cuenta.sincronizado_en ? new Date(cuenta.sincronizado_en).getTime() : 0;
  if (!force && Date.now() - ultima < COOLDOWN_MS) {
    await asegurarStats(db, cuenta);
    return cacheado("cooldown", "Los datos se actualizaron hace menos de 10 minutos.");
  }

  const { puuid, plataforma } = cuenta;
  try {
    const [summoner, ranked, ids] = await Promise.all([
      getSummonerByPuuid(plataforma, puuid),
      getRankedSolo(plataforma, puuid),
      getMatchIds(plataforma, puuid, PARTIDAS_A_TRAER),
    ]);

    // Partidas ya cacheadas (por este jugador o por otro que estuvo en la misma).
    const { data: existentes, error: errEx } = await db
      .from("partidas")
      .select("match_id")
      .in("match_id", ids.length ? ids : ["-"]);
    if (errEx) throw errEx;
    const yaGuardadas = new Set(existentes.map((e) => e.match_id));

    // Solo pedimos a Riot las que no tenemos.
    const nuevas = [];
    const faltantes = ids.filter((id) => !yaGuardadas.has(id));
    for (let i = 0; i < faltantes.length; i += TANDA) {
      const tanda = await Promise.all(
        faltantes.slice(i, i + TANDA).map((id) => getMatch(plataforma, id))
      );
      nuevas.push(...tanda);
    }

    if (nuevas.length) {
      const { error: errP } = await db
        .from("partidas")
        .upsert(nuevas.map((m) => filaPartida(m, plataforma)), { ignoreDuplicates: true });
      if (errP) throw errP;
    }

    // Partidas que ya estaban en caché pero sin nuestra fila (las trajo otro jugador).
    const { data: propias, error: errPr } = await db
      .from("partidas_jugador")
      .select("match_id")
      .eq("puuid", puuid)
      .in("match_id", ids.length ? ids : ["-"]);
    if (errPr) throw errPr;
    const conFila = new Set(propias.map((p) => p.match_id));
    const sinFila = [...yaGuardadas].filter((id) => !conFila.has(id));
    let deCache = [];
    if (sinFila.length) {
      const { data, error: errC } = await db
        .from("partidas")
        .select("datos")
        .in("match_id", sinFila);
      if (errC) throw errC;
      deCache = data.map((d) => d.datos);
    }

    const filas = [...nuevas, ...deCache]
      .map((m) => extraerParticipacion(m, puuid))
      .filter(Boolean);
    if (filas.length) {
      const { error: errPj } = await db
        .from("partidas_jugador")
        .upsert(filas, { onConflict: "match_id,puuid" });
      if (errPj) throw errPj;
    }

    const sincronizado_en = new Date().toISOString();
    const { error: errU } = await db
      .from("cuentas_riot")
      .update({
        profile_icon_id: summoner.profileIconId,
        nivel: summoner.summonerLevel,
        rango_tier: ranked?.tier ?? null,
        rango_division: ranked?.rank ?? null,
        rango_lp: ranked?.leaguePoints ?? null,
        rango_valor: ranked ? rangoValor(ranked.tier, ranked.rank, ranked.leaguePoints) : null,
        rango_wins: ranked?.wins ?? null,
        rango_losses: ranked?.losses ?? null,
        sincronizado_en,
      })
      .eq("id", cuenta.id);
    if (errU) throw errU;

    await recalcularStats(db, cuenta.id, puuid);

    return {
      estado: "actualizado",
      nuevas: nuevas.length,
      sincronizado_en,
      rango_tier: ranked?.tier ?? null,
      rango_division: ranked?.rank ?? null,
      rango_lp: ranked?.leaguePoints ?? null,
    };
  } catch (err) {
    // Si Riot falla, la demo sigue con lo que ya está guardado.
    if (err instanceof RiotError) {
      await asegurarStats(db, cuenta);
      return cacheado("stale", `Mostrando datos guardados. ${MENSAJES_RIOT[err.code]}`);
    }
    throw err;
  }
}
