// Migra los puuid guardados a los de la clave de Riot actual.
// Riot encripta el puuid POR APLICACIÓN: con una clave nueva, los puuid viejos dan
// "400 Exception decrypting". Este script re-resuelve cada cuenta por su Riot ID (account-v1)
// y actualiza cuentas_riot.puuid y partidas_jugador.puuid. No imprime claves.
//
// Uso (desde la raíz del repo):
//   node --env-file=.env.local scripts/migrar-puuids.mjs            → simulación (no escribe nada)
//   node --env-file=.env.local scripts/migrar-puuids.mjs --aplicar  → aplica los cambios
//
// Importante: después de migrar, Vercel tiene que usar ESTA MISMA clave de Riot.
import { createClient } from "@supabase/supabase-js";

const APLICAR = process.argv.includes("--aplicar");
const REGION = { la1: "americas", la2: "americas", br1: "americas", na1: "americas" };
const limpio = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "");

const riotKey = limpio(process.env.RIOT_API_KEY);
const url = limpio(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = limpio(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!riotKey || !url || !serviceKey) {
  console.error("❌ Faltan RIOT_API_KEY, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function puuidActual(cuenta) {
  const host = `https://${REGION[cuenta.plataforma] ?? "americas"}.api.riotgames.com`;
  const res = await fetch(
    `${host}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(cuenta.game_name)}/${encodeURIComponent(cuenta.tag_line)}`,
    { headers: { "X-Riot-Token": riotKey } }
  );
  if (res.status === 429) {
    await dormir((Number(res.headers.get("Retry-After")) || 2) * 1000);
    return puuidActual(cuenta);
  }
  if (!res.ok) return { error: `Riot respondió ${res.status}` };
  return { puuid: (await res.json()).puuid };
}

const { data: cuentas, error } = await db
  .from("cuentas_riot")
  .select("id, game_name, tag_line, plataforma, puuid, verificada");
if (error) {
  console.error("❌ No se pudo leer cuentas_riot:", error.message);
  process.exit(1);
}

console.log(`${APLICAR ? "APLICANDO" : "SIMULACIÓN (agregá --aplicar para escribir)"} · ${cuentas.length} cuentas\n`);
let migradas = 0;
let fallidas = 0;

for (const c of cuentas) {
  const etiqueta = `${c.game_name}#${c.tag_line}`;
  const { puuid, error: errRiot } = await puuidActual(c);
  if (errRiot) {
    fallidas++;
    console.log(`⚠️  ${etiqueta}: ${errRiot} (¿cambió su Riot ID?). Queda sin migrar: que la vuelva a vincular.`);
    continue;
  }
  if (puuid === c.puuid) {
    console.log(`=  ${etiqueta}: ya tiene el puuid de esta clave`);
    continue;
  }

  const { count } = await db
    .from("partidas_jugador")
    .select("match_id", { count: "exact", head: true })
    .eq("puuid", c.puuid);
  console.log(`→  ${etiqueta}: puuid ${c.puuid.slice(0, 8)}… → ${puuid.slice(0, 8)}… (${count ?? 0} filas de partidas)`);
  if (!APLICAR) continue;

  // Si ya hay filas con el puuid nuevo (alguien sincronizó después del cambio), se borran las viejas
  // duplicadas en vez de chocar con la clave primaria (match_id, puuid).
  const { data: nuevas } = await db.from("partidas_jugador").select("match_id").eq("puuid", puuid);
  if (nuevas?.length) {
    await db
      .from("partidas_jugador")
      .delete()
      .eq("puuid", c.puuid)
      .in("match_id", nuevas.map((n) => n.match_id));
  }
  const { error: e1 } = await db.from("partidas_jugador").update({ puuid }).eq("puuid", c.puuid);
  const { error: e2 } = await db.from("cuentas_riot").update({ puuid }).eq("id", c.id);
  if (e1 || e2) {
    fallidas++;
    console.log(`   ❌ error al guardar: ${(e1 ?? e2).message}`);
  } else {
    migradas++;
  }
  await dormir(100); // amable con el rate limit
}

console.log(`\nListo: ${migradas} migradas, ${fallidas} con problemas${APLICAR ? "" : " (simulación)"}.`);
