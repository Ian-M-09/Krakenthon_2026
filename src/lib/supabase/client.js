// Cliente de Supabase para el NAVEGADOR (componentes con "use client").
// Usa solo la anon key: lo que puede hacer lo limita el RLS de la base.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
