// Usuario logueado en un route handler, o null.
import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
