// POST { riotId: "Nombre#TAG", plataforma: "la2" }
// Resuelve el Riot ID → guarda la cuenta SIN verificar y le asigna un ícono de verificación.
import { ok, fail, failDesde } from "@/lib/api";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountByRiotId, getSummonerByPuuid } from "@/lib/riot/endpoints";
import { esPlataformaValida } from "@/lib/riot/regions";
import { getVersion, urlIconoPerfil } from "@/lib/riot/ddragon";
import {
  parsearRiotId,
  elegirIconoVerificacion,
  VERIFICACION_TTL_MS,
} from "@/lib/riot/verificacion";

export async function POST(request) {
  const user = await getUsuario();
  if (!user) return fail("UNAUTHORIZED", "Iniciá sesión para vincular tu cuenta.", 401);

  const body = await request.json().catch(() => ({}));
  const riotId = parsearRiotId(body.riotId);
  if (!riotId) return fail("BAD_REQUEST", "Escribí tu Riot ID con el formato Nombre#TAG.");
  if (!esPlataformaValida(body.plataforma)) return fail("BAD_REQUEST", "Elegí una región válida.");
  const { plataforma } = body;

  try {
    const db = createAdminClient();

    const { data: perfil } = await db.from("perfiles").select("id").eq("id", user.id).maybeSingle();
    if (!perfil) return fail("NO_PROFILE", "Terminá el onboarding antes de vincular tu cuenta.");

    const account = await getAccountByRiotId(plataforma, riotId.gameName, riotId.tagLine);

    // ¿Ya la verificó otra persona?
    const { data: verificadaPorOtro } = await db
      .from("cuentas_riot")
      .select("id")
      .eq("puuid", account.puuid)
      .eq("verificada", true)
      .neq("usuario_id", user.id)
      .maybeSingle();
    if (verificadaPorOtro) {
      return fail("ALREADY_CLAIMED", "Esa cuenta ya está vinculada y verificada por otro usuario.", 409);
    }

    // summoner-v4 también confirma que la cuenta existe en esa región.
    const summoner = await getSummonerByPuuid(plataforma, account.puuid);

    const { data: actual } = await db
      .from("cuentas_riot")
      .select("id, puuid, verificada")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (actual?.verificada && actual.puuid === account.puuid) {
      return fail("ALREADY_VERIFIED", "Esta cuenta ya está vinculada y verificada.", 409);
    }

    const icono = elegirIconoVerificacion(summoner.profileIconId);
    const expira = new Date(Date.now() + VERIFICACION_TTL_MS).toISOString();
    const cambiaDeCuenta = actual && actual.puuid !== account.puuid;

    const fila = {
      usuario_id: user.id,
      puuid: account.puuid,
      game_name: account.gameName,
      tag_line: account.tagLine,
      plataforma,
      verificada: false,
      icono_verificacion: icono,
      verificacion_expira: expira,
      profile_icon_id: summoner.profileIconId,
      nivel: summoner.summonerLevel,
      // Si cambia de cuenta, el rango y el sync viejos ya no valen.
      ...(cambiaDeCuenta && {
        rango_tier: null, rango_division: null, rango_lp: null, rango_valor: null,
        rango_wins: null, rango_losses: null, sincronizado_en: null,
      }),
    };

    const { data: cuenta, error } = await db
      .from("cuentas_riot")
      .upsert(fila, { onConflict: "usuario_id" })
      .select("id, game_name, tag_line, plataforma, icono_verificacion, verificacion_expira")
      .single();
    if (error) throw error;

    if (cambiaDeCuenta) await db.from("estadisticas_jugador").delete().eq("cuenta_id", cuenta.id);

    const version = await getVersion();
    return ok({ ...cuenta, icono_url: urlIconoPerfil(version, icono) });
  } catch (err) {
    return failDesde(err);
  }
}
