"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Misma regla que el CHECK de `perfiles.nombre_usuario` en schema.sql.
const NOMBRE_VALIDO = /^[A-Za-z0-9_]{3,20}$/;
const INTENCIONES = ["busco_equipo", "busco_jugadores"];

export async function completarOnboarding(_prevState, formData) {
  const nombre_usuario = String(formData.get("nombre_usuario") ?? "").trim();
  const intencion = String(formData.get("intencion") ?? "");

  if (!NOMBRE_VALIDO.test(nombre_usuario)) {
    return { error: "El nombre debe tener de 3 a 20 caracteres: letras, números o _.", nombre_usuario };
  }
  if (!INTENCIONES.includes(intencion)) {
    return { error: "Elegí si buscás equipo o jugadores.", nombre_usuario };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // El RLS solo deja insertar la fila propia (auth.uid() = id).
  const { error } = await supabase
    .from("perfiles")
    .insert({ id: user.id, nombre_usuario, intencion });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese nombre de usuario ya está en uso.", nombre_usuario };
    }
    console.error("onboarding: error al crear perfil", error);
    return { error: "No pudimos guardar tu perfil. Probá de nuevo.", nombre_usuario };
  }

  // Fila vacía de datos declarados: se completa en /perfil/editar (T13).
  const { error: errorPJ } = await supabase
    .from("perfiles_jugador")
    .upsert({ usuario_id: user.id }, { onConflict: "usuario_id", ignoreDuplicates: true });
  if (errorPJ) console.error("onboarding: error al crear perfiles_jugador", errorPJ);

  // Quien busca equipo arranca vinculando su cuenta; quien busca jugadores, creando su equipo.
  redirect(intencion === "busco_equipo" ? "/perfil/vincular" : "/equipos/nuevo");
}
