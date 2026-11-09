// Seed para la demo (T22): un usuario reclutador de demo + 3 equipos de ejemplo.
// NO crea jugadores ni stats: las cuentas de LoL tienen que ser reales y vinculadas por sus
// dueños (con su permiso), porque las stats verificadas salen de la Riot API.
// Idempotente: si se corre dos veces no duplica nada (busca por email y por nombre de equipo).
//
// Uso (desde la raíz del repo):
//   node --env-file=.env.local scripts/seed-demo.mjs            → simulación (no escribe nada)
//   node --env-file=.env.local scripts/seed-demo.mjs --aplicar  → crea lo que falte
// Contraseña del usuario demo: SEED_DEMO_PASSWORD (si no está, se genera una y se imprime UNA vez).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const APLICAR = process.argv.includes("--aplicar");
const limpio = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const url = limpio(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = limpio(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!url || !serviceKey) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO = { email: "demo-equipos@krakethon.app", nombre_usuario: "demo_equipos" };
const AVISO = "Equipo de ejemplo creado para la demo de Krakethon.";
const lunAVie = (desde, hasta) => [0, 1, 2, 3, 4].map((dia) => ({ dia, desde, hasta }));

const EQUIPOS = [
  {
    nombre: "Kraken Salta",
    tag: "KRK",
    descripcion: `${AVISO} Semi-pro del NOA, jugamos torneos regionales y buscamos jungla y support para completar el roster.`,
    nivel: "semi_pro",
    rango_minimo: "SILVER",
    roles_buscados: ["JUNGLE", "UTILITY"],
    idiomas: ["es"],
    pais: "AR",
    zona_horaria: "America/Argentina/Salta",
    horarios: lunAVie("20:00", "23:30"),
  },
  {
    nombre: "Andes Esports",
    tag: "AND",
    descripcion: `${AVISO} Equipo amateur chileno-argentino, entrenamos tres veces por semana.`,
    nivel: "amateur",
    rango_minimo: "BRONZE",
    roles_buscados: ["MIDDLE", "BOTTOM"],
    idiomas: ["es"],
    pais: "CL",
    zona_horaria: "America/Santiago",
    horarios: [1, 3, 5].map((dia) => ({ dia, desde: "19:00", hasta: "22:00" })),
  },
  {
    nombre: "Pampa Gaming",
    tag: "PMP",
    descripcion: `${AVISO} Amateur, jugamos los fines de semana. Hablamos español y portugués.`,
    nivel: "amateur",
    rango_minimo: null,
    roles_buscados: ["TOP", "UTILITY"],
    idiomas: ["es", "pt"],
    pais: "AR",
    zona_horaria: "America/Argentina/Buenos_Aires",
    horarios: [5, 6].map((dia) => ({ dia, desde: "16:00", hasta: "20:00" })),
  },
];

console.log(APLICAR ? "APLICANDO" : "SIMULACIÓN (agregá --aplicar para escribir)");

// 1) Usuario reclutador de demo
const { data: lista, error: errL } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
if (errL) {
  console.error("❌ No se pudieron listar usuarios:", errL.message);
  process.exit(1);
}
let demo = lista.users.find((u) => u.email === DEMO.email);
if (demo) {
  console.log(`=  Usuario demo ya existe (${DEMO.email})`);
} else if (APLICAR) {
  const password = limpio(process.env.SEED_DEMO_PASSWORD) || randomBytes(9).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email: DEMO.email, password, email_confirm: true });
  if (error) {
    console.error("❌ No se pudo crear el usuario demo:", error.message);
    process.exit(1);
  }
  demo = data.user;
  console.log(`+  Usuario demo creado: ${DEMO.email}`);
  if (!process.env.SEED_DEMO_PASSWORD) console.log(`   Contraseña (guardala, no se vuelve a mostrar): ${password}`);
} else {
  console.log(`+  Crearía el usuario demo ${DEMO.email}`);
}

if (demo && APLICAR) {
  const { error } = await db
    .from("perfiles")
    .upsert({ id: demo.id, nombre_usuario: DEMO.nombre_usuario, intencion: "busco_jugadores" }, { onConflict: "id" });
  if (error) console.error("❌ perfil demo:", error.message);
}

// 2) Equipos (el trigger trg_equipo_dueno agrega al creador como dueño)
for (const e of EQUIPOS) {
  const { data: existe } = await db.from("equipos").select("id").eq("nombre", e.nombre).maybeSingle();
  if (existe) {
    console.log(`=  Equipo "${e.nombre}" ya existe`);
    continue;
  }
  if (!APLICAR || !demo) {
    console.log(`+  Crearía el equipo "${e.nombre}"`);
    continue;
  }
  const { error } = await db.from("equipos").insert({ ...e, reclutando: true, creado_por: demo.id });
  console.log(error ? `❌ "${e.nombre}": ${error.message}` : `+  Equipo "${e.nombre}" creado`);
}

console.log("\nListo. Para la demo: entrá con el usuario demo → /equipos → \"Buscar jugadores para este equipo\".");
