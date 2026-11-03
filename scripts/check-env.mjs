// Diagnóstico de variables de Supabase. No imprime secretos.
// Uso (desde la raíz del repo): node --env-file=.env.local scripts/check-env.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

if (!url) fail("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
if (!raw) fail("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");

const key = raw.trim().replace(/^["']|["']$/g, "");
if (key !== raw) console.warn("⚠️  La key tiene espacios o comillas de más: sacalos del .env.local");

const urlRef = new URL(url).hostname.split(".")[0];
console.log("URL del proyecto:", url, "(ref:", urlRef + ")");
console.log("Largo de la key:", key.length, "caracteres");

if (key.startsWith("sb_secret_")) {
  console.log("Formato: secret key nueva (sb_secret_...) ✔");
} else if (key.startsWith("sb_publishable_")) {
  fail("Pegaste la PUBLISHABLE key, no la secret.");
} else {
  const parts = key.split(".");
  if (parts.length !== 3) {
    fail(`La key tiene ${parts.length} parte(s) y un JWT válido tiene 3 (separadas por puntos). Está cortada: copiala de nuevo con el botón Copy.`);
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    fail("No se pudo leer el contenido de la key: está mal copiada.");
  }
  console.log("Formato: JWT legacy · role =", payload.role, "· ref =", payload.ref);
  if (payload.role !== "service_role") fail(`Es la key "${payload.role}", no la service_role.`);
  if (payload.ref !== urlRef) fail(`La key es del proyecto "${payload.ref}" pero la URL es del proyecto "${urlRef}".`);
}

// Prueba real: listar usuarios solo es posible con la service role
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
if (error) fail("Supabase rechazó la key: " + error.message);
console.log("✅ Service role OK. Usuarios encontrados en esta página:", data.users.length);