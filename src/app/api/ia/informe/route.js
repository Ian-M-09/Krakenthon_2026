// POST: genera (o devuelve del caché) el informe de scouting IA de la cuenta del usuario logueado.
import { ok, fail, failDesde } from "@/lib/api";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cargarDatosInforme, hashInput, generarInforme } from "@/lib/ia/informe";
import { IAError, MENSAJES_IA, esModoMock, MODELO_MOCK } from "@/lib/ia/gemini";

const COOLDOWN_MS = 5 * 60 * 1000;

export async function POST() {
  const user = await getUsuario();
  if (!user) return fail("UNAUTHORIZED", "Iniciá sesión para generar tu informe.", 401);

  try {
    const db = createAdminClient();
    const { data: cuenta } = await db
      .from("cuentas_riot")
      .select("id")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (!cuenta) return fail("NO_ACCOUNT", "Primero vinculá tu cuenta de LoL.", 404);

    const input = await cargarDatosInforme(db, cuenta.id, user.id);
    if (!input) {
      return fail("NO_STATS", "Todavía no hay partidas para analizar. Actualizá tus datos primero.");
    }
    const stats_hash = hashInput(input);

    // Caché: mismas stats → mismo informe, sin llamar a Gemini. Se separa "mock" de "real"
    // (sea cual sea el modelo real que respondió, primario o fallback) para que un informe de
    // ejemplo nunca quede servido cuando se activa Gemini.
    let consulta = db
      .from("informes_ia")
      .select("contenido, creado_en, modelo")
      .eq("cuenta_id", cuenta.id)
      .eq("stats_hash", stats_hash);
    consulta = esModoMock() ? consulta.eq("modelo", MODELO_MOCK) : consulta.neq("modelo", MODELO_MOCK);
    const { data: cacheado } = await consulta.maybeSingle();
    if (cacheado) return ok({ ...cacheado, cacheado: true });

    // Límite contra el abuso: 1 generación nueva cada 5 min por cuenta (el mock no gasta cuota).
    if (!esModoMock()) {
      const { data: ultimo } = await db
        .from("informes_ia")
        .select("creado_en")
        .eq("cuenta_id", cuenta.id)
        .neq("modelo", MODELO_MOCK)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ultimo && Date.now() - new Date(ultimo.creado_en).getTime() < COOLDOWN_MS) {
        return fail("COOLDOWN", "Ya generaste un informe hace menos de 5 minutos. Esperá un poco.", 429);
      }
    }

    const { informe: contenido, modelo } = await generarInforme(input);
    // upsert por (cuenta_id, stats_hash): el informe real reemplaza al mock de las mismas stats.
    const fila = { cuenta_id: cuenta.id, stats_hash, modelo, contenido, creado_en: new Date().toISOString() };
    const { data: guardado, error } = await db
      .from("informes_ia")
      .upsert(fila, { onConflict: "cuenta_id,stats_hash" })
      .select("contenido, creado_en, modelo")
      .single();
    if (error) throw error;

    return ok({ ...guardado, cacheado: false });
  } catch (err) {
    if (err instanceof IAError) {
      const status = err.code === "IA_RATE_LIMITED" ? 429 : 503;
      return fail(err.code, MENSAJES_IA[err.code], status);
    }
    return failDesde(err);
  }
}
