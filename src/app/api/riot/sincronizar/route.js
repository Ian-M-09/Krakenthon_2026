// POST: sincroniza la cuenta del usuario logueado (con cooldown de 10 min).
import { ok, fail, failDesde } from "@/lib/api";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAccount } from "@/lib/riot/sync";

export async function POST() {
  const user = await getUsuario();
  if (!user) return fail("UNAUTHORIZED", "Iniciá sesión para actualizar tus datos.", 401);

  try {
    const { data: cuenta } = await createAdminClient()
      .from("cuentas_riot")
      .select("id")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (!cuenta) return fail("NO_ACCOUNT", "Primero vinculá tu cuenta de LoL.", 404);

    return ok(await syncAccount(cuenta.id));
  } catch (err) {
    return failDesde(err);
  }
}
