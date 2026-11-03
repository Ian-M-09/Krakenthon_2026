"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLES, IDIOMAS, PAISES, TIPOS_CONTACTO, VISIBILIDADES } from "@/lib/catalogos";
import { esZonaValida, normalizarHorarios } from "@/lib/horarios";

const BIO_MAX = 500;
const CONTACTO_MAX = 120;

// Lee el formulario tal cual vino (para devolverlo si hay un error y no perder lo cargado).
function leerFormulario(formData) {
  const horarios = [];
  for (let dia = 0; dia < 7; dia++) {
    if (formData.get(`dia_${dia}_activo`)) {
      horarios.push({
        dia,
        desde: String(formData.get(`dia_${dia}_desde`) ?? ""),
        hasta: String(formData.get(`dia_${dia}_hasta`) ?? ""),
      });
    }
  }
  return {
    pais: String(formData.get("pais") ?? ""),
    idiomas: formData.getAll("idiomas").map(String),
    roles: formData.getAll("roles").map(String),
    zona_horaria: String(formData.get("zona_horaria") ?? ""),
    horarios,
    bio: String(formData.get("bio") ?? "").trim(),
    buscando_equipo: formData.get("buscando_equipo") === "on",
    contacto_tipo: String(formData.get("contacto_tipo") ?? ""),
    contacto_valor: String(formData.get("contacto_valor") ?? "").trim(),
    contacto_visibilidad: String(formData.get("contacto_visibilidad") ?? ""),
  };
}

// Guarda SOLO los datos declarados (perfiles_jugador + contactos_jugador).
// Las stats y la cuenta de Riot no se pueden tocar desde acá: esas tablas no tienen
// policies de escritura para el cliente, así que el RLS lo rechazaría igual.
export async function guardarDisponibilidad(_prevState, formData) {
  const v = leerFormulario(formData);
  const error = (mensaje) => ({ error: mensaje, valores: v, n: Date.now() });

  // Validación por whitelist: a la BD solo llegan códigos conocidos.
  if (v.pais && !Object.hasOwn(PAISES, v.pais)) return error("Elegí un país de la lista.");
  if (!v.idiomas.every((i) => Object.hasOwn(IDIOMAS, i))) return error("Idioma inválido.");
  if (!v.roles.every((r) => Object.hasOwn(ROLES, r))) return error("Rol inválido.");
  if (!esZonaValida(v.zona_horaria)) return error("Elegí una zona horaria válida.");
  if (v.bio.length > BIO_MAX) return error(`La bio puede tener hasta ${BIO_MAX} caracteres.`);

  const horarios = normalizarHorarios(v.horarios);
  if (horarios.length !== v.horarios.length) {
    return error("Revisá los horarios: cada día marcado necesita hora de inicio y de fin distintas.");
  }

  if (v.contacto_valor) {
    if (!Object.hasOwn(TIPOS_CONTACTO, v.contacto_tipo)) return error("Elegí el tipo de contacto.");
    if (!Object.hasOwn(VISIBILIDADES, v.contacto_visibilidad)) return error("Elegí quién puede ver tu contacto.");
    if (v.contacto_valor.length > CONTACTO_MAX) return error(`El contacto puede tener hasta ${CONTACTO_MAX} caracteres.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/editar");

  const { error: errPJ } = await supabase.from("perfiles_jugador").upsert(
    {
      usuario_id: user.id,
      pais: v.pais || null,
      idiomas: v.idiomas,
      roles: v.roles,
      zona_horaria: v.zona_horaria,
      horarios,
      bio: v.bio || null,
      buscando_equipo: v.buscando_equipo,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "usuario_id" }
  );
  if (errPJ) {
    console.error("editar: perfiles_jugador", errPJ);
    return error("No pudimos guardar tus datos. Probá de nuevo.");
  }

  const { error: errC } = v.contacto_valor
    ? await supabase.from("contactos_jugador").upsert(
        {
          usuario_id: user.id,
          tipo: v.contacto_tipo,
          valor: v.contacto_valor,
          visibilidad: v.contacto_visibilidad,
        },
        { onConflict: "usuario_id" }
      )
    : await supabase.from("contactos_jugador").delete().eq("usuario_id", user.id);
  if (errC) {
    console.error("editar: contactos_jugador", errC);
    return error("Guardamos tus datos pero no el contacto. Probá de nuevo.");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre_usuario")
    .eq("id", user.id)
    .single();
  redirect(`/jugadores/${perfil.nombre_usuario}`);
}
