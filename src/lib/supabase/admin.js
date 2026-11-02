// Cliente de Supabase con la SERVICE ROLE: se saltea el RLS.
// Solo para el servidor (sync de Riot, stats, informes IA). "server-only" hace fallar
// el build si alguien lo importa desde un componente de cliente.
import "server-only";
import { createClient } from "@supabase/supabase-js";

let adminClient = null;

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  }

  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return adminClient;
}
