"use server";

// Escrituras de equipos con la sesión del usuario: el RLS de schema.sql decide quién puede qué
// (crear: cualquiera logueado · editar: dueño/reclutador · miembros: el dueño · salir: uno mismo).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leerFormEquipo, validarEquipo, esUuid, ROLES_EQUIPO } from "@/lib/equipos";

async function usuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/equipos");
  return { supabase, user };
}

const conError = (mensaje, valores) => ({ error: mensaje, valores, n: Date.now() });

export async function crearEquipo(_prev, formData) {
  const v = leerFormEquipo(formData);
  const { fila, error } = validarEquipo(v);
  if (error) return conError(error, v);

  const { supabase, user } = await usuarioActual();
  // El trigger trg_equipo_dueno agrega al creador como dueño.
  const { data, error: errDb } = await supabase
    .from("equipos")
    .insert({ ...fila, creado_por: user.id })
    .select("id")
    .single();
  if (errDb) {
    if (errDb.code === "23505") return conError("Ya existe un equipo con ese nombre.", v);
    console.error("crearEquipo", errDb);
    return conError("No pudimos crear el equipo. Probá de nuevo.", v);
  }
  redirect(`/equipos/${data.id}`);
}

export async function actualizarEquipo(equipoId, _prev, formData) {
  const v = leerFormEquipo(formData);
  if (!esUuid(equipoId)) return conError("Equipo inválido.", v);
  const { fila, error } = validarEquipo(v);
  if (error) return conError(error, v);

  const { supabase } = await usuarioActual();
  const { data, error: errDb } = await supabase
    .from("equipos")
    .update(fila)
    .eq("id", equipoId)
    .select("id");
  if (errDb?.code === "23505") return conError("Ya existe un equipo con ese nombre.", v);
  if (errDb) {
    console.error("actualizarEquipo", errDb);
    return conError("No pudimos guardar los cambios. Probá de nuevo.", v);
  }
  // Si el RLS no lo dejó, el update no afecta ninguna fila (no tira error).
  if (!data?.length) return conError("Solo el dueño o un reclutador pueden editar el equipo.", v);
  redirect(`/equipos/${equipoId}`);
}

export async function agregarMiembro(equipoId, _prev, formData) {
  const nombre = String(formData.get("nombre_usuario") ?? "").trim();
  const rol = String(formData.get("rol") ?? "");
  if (!esUuid(equipoId)) return { error: "Equipo inválido." };
  if (!nombre) return { error: "Escribí el nombre de usuario." };
  if (!Object.hasOwn(ROLES_EQUIPO, rol) || rol === "dueno") return { error: "Elegí reclutador o jugador." };

  const { supabase } = await usuarioActual();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .eq("nombre_usuario", nombre)
    .maybeSingle();
  if (!perfil) return { error: `No existe el usuario "${nombre}".` };

  const { error } = await supabase
    .from("miembros_equipo")
    .insert({ equipo_id: equipoId, usuario_id: perfil.id, rol });
  if (error?.code === "23505") return { error: "Ese usuario ya es miembro del equipo." };
  if (error?.code === "42501") return { error: "Solo el dueño puede agregar miembros." };
  if (error) {
    console.error("agregarMiembro", error);
    return { error: "No pudimos agregar al miembro. Probá de nuevo." };
  }
  revalidatePath(`/equipos/${equipoId}`);
  return { ok: `Agregaste a ${nombre}.` };
}

export async function cambiarRolMiembro(equipoId, usuarioId, formData) {
  const rol = String(formData.get("rol") ?? "");
  if (!esUuid(equipoId) || !esUuid(usuarioId) || !["reclutador", "jugador"].includes(rol)) return;
  const { supabase } = await usuarioActual();
  await supabase
    .from("miembros_equipo")
    .update({ rol })
    .eq("equipo_id", equipoId)
    .eq("usuario_id", usuarioId)
    .neq("rol", "dueno"); // el dueño no se degrada desde acá
  revalidatePath(`/equipos/${equipoId}`);
}

// Quitar a otro (dueño) o salirse uno mismo. El dueño no puede salir: tiene que borrar el equipo.
export async function quitarMiembro(equipoId, usuarioId) {
  if (!esUuid(equipoId) || !esUuid(usuarioId)) return;
  const { supabase, user } = await usuarioActual();
  await supabase
    .from("miembros_equipo")
    .delete()
    .eq("equipo_id", equipoId)
    .eq("usuario_id", usuarioId)
    .neq("rol", "dueno");
  if (usuarioId === user.id) redirect("/equipos");
  revalidatePath(`/equipos/${equipoId}`);
}

export async function eliminarEquipo(equipoId) {
  if (!esUuid(equipoId)) return;
  const { supabase } = await usuarioActual();
  // RLS: solo el dueño puede borrar. Los miembros se borran en cascada.
  await supabase.from("equipos").delete().eq("id", equipoId);
  redirect("/equipos");
}
