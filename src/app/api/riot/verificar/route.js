// POST: compara el ícono que tiene puesto el jugador con el que le pedimos.
// Si coincide → verificada = true y se dispara el primer sync.
import { ok, fail, failDesde } from "@/lib/api";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSummonerByPuuid } from "@/lib/riot/endpoints";
import { syncAccount } from "@/lib/riot/sync";

export async function POST() {
  const user = await getUsuario();
  if (!user) return fail("UNAUTHORIZED", "Iniciá sesión para verificar tu cuenta.", 401);

  try {
    const db = createAdminClient();
    const { data: cuenta } = await db
      .from("cuentas_riot")
      .select("id, puuid, plataforma, verificada, icono_verificacion, verificacion_expira")
      .eq("usuario_id", user.id)
      .maybeSingle();

    if (!cuenta) return fail("NO_ACCOUNT", "Primero vinculá tu cuenta de LoL.", 404);
    if (cuenta.verificada) return ok({ verificada: true });
    if (cuenta.icono_verificacion == null || new Date(cuenta.verificacion_expira) < new Date()) {
      return fail("EXPIRED", "Se venció el tiempo para verificar. Generá un ícono nuevo.", 410);
    }

    const summoner = await getSummonerByPuuid(cuenta.plataforma, cuenta.puuid);
    if (summoner.profileIconId !== cuenta.icono_verificacion) {
      return fail(
        "ICON_MISMATCH",
        "Todavía no vemos el ícono pedido en tu perfil. Cambialo en el cliente de LoL y probá de nuevo (a veces Riot tarda unos segundos en actualizarlo).",
        409
      );
    }

    const { error } = await db
      .from("cuentas_riot")
      .update({
        verificada: true,
        icono_verificacion: null,
        verificacion_expira: null,
        profile_icon_id: summoner.profileIconId,
      })
      .eq("id", cuenta.id);
    // 23505 = el índice único de puuid verificado: otro usuario la verificó justo antes.
    if (error?.code === "23505") {
      return fail("ALREADY_CLAIMED", "Esa cuenta ya fue verificada por otro usuario.", 409);
    }
    if (error) throw error;

    // Los reclamos sin verificar del mismo puuid hechos por otros usuarios dejan de valer.
    await db
      .from("cuentas_riot")
      .delete()
      .eq("puuid", cuenta.puuid)
      .eq("verificada", false)
      .neq("usuario_id", user.id);

    // Primer sync: si falla, la verificación igual quedó hecha.
    let sync = null;
    try {
      sync = await syncAccount(cuenta.id, { force: true });
    } catch (err) {
      console.error("Sync post-verificación falló", err);
    }

    return ok({ verificada: true, sync });
  } catch (err) {
    return failDesde(err);
  }
}
