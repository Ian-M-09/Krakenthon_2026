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

// ---------------------------------------------------------------------------
// Postulaciones (T20, dirección jugador → equipo). Tabla `solicitudes` con RLS de schema.sql:
// el jugador crea la suya (origen='jugador'); el staff (dueño/reclutador) las ve y responde.
// ---------------------------------------------------------------------------
const MENSAJE_MAX = 500;

export async function postularme(equipoId, _prev, formData) {
  if (!esUuid(equipoId)) return { error: "Equipo inválido." };
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (mensaje.length > MENSAJE_MAX) return { error: `El mensaje puede tener hasta ${MENSAJE_MAX} caracteres.` };

  const { supabase, user } = await usuarioActual();
  const { data: miembro } = await supabase
    .from("miembros_equipo")
    .select("rol")
    .eq("equipo_id", equipoId)
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (miembro) return { error: "Ya sos miembro de este equipo." };

  const { error } = await supabase.from("solicitudes").insert({
    equipo_id: equipoId,
    jugador_id: user.id,
    origen: "jugador",
    mensaje: mensaje || null,
  });
  // Índice único parcial: una sola solicitud pendiente por jugador y equipo.
  if (error?.code === "23505") return { error: "Ya tenés una postulación pendiente en este equipo." };
  if (error) {
    console.error("postularme", error);
    return { error: "No pudimos enviar tu postulación. Probá de nuevo." };
  }
  revalidatePath(`/equipos/${equipoId}`);
  return { ok: "¡Listo! El equipo va a ver tu postulación y tu perfil verificado." };
}

// Aceptar: el jugador entra como miembro. Por el RLS de miembros_equipo, solo el dueño puede.
export async function aceptarSolicitud(equipoId, solicitudId) {
  if (!esUuid(equipoId) || !esUuid(solicitudId)) return;
  const { supabase } = await usuarioActual();
  const { data: s } = await supabase
    .from("solicitudes")
    .select("jugador_id, estado")
    .eq("id", solicitudId)
    .eq("equipo_id", equipoId)
    .maybeSingle();
  if (!s || s.estado !== "pendiente") return;

  const { error } = await supabase
    .from("miembros_equipo")
    .insert({ equipo_id: equipoId, usuario_id: s.jugador_id, rol: "jugador" });
  // 23505 = ya era miembro: igual se marca como aceptada.
  if (error && error.code !== "23505") {
    console.error("aceptarSolicitud", error);
    return;
  }
  await supabase.from("solicitudes").update({ estado: "aceptada" }).eq("id", solicitudId);
  revalidatePath(`/equipos/${equipoId}`);
}

export async function rechazarSolicitud(equipoId, solicitudId) {
  if (!esUuid(equipoId) || !esUuid(solicitudId)) return;
  const { supabase } = await usuarioActual();
  await supabase
    .from("solicitudes")
    .update({ estado: "rechazada" })
    .eq("id", solicitudId)
    .eq("equipo_id", equipoId)
    .eq("estado", "pendiente");
  revalidatePath(`/equipos/${equipoId}`);
}

export async function eliminarEquipo(equipoId) {
  if (!esUuid(equipoId)) return;
  const { supabase } = await usuarioActual();
  // RLS: solo el dueño puede borrar. Los miembros se borran en cascada.
  await supabase.from("equipos").delete().eq("id", equipoId);
  redirect("/equipos");
}
