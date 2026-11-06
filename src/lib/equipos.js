// Validación del formulario de equipo y lecturas comunes. Validación por whitelist:
// a la BD solo llegan códigos conocidos (los CHECK de schema.sql son la última barrera).
import { ROLES, IDIOMAS, PAISES } from "./catalogos";
import { esTier } from "./rangos";
import { esZonaValida, normalizarHorarios, horariosDesdeFormData } from "./horarios";

export const NIVELES = { amateur: "Amateur", semi_pro: "Semi-pro" };
export const ROLES_EQUIPO = { dueno: "Dueño", reclutador: "Reclutador", jugador: "Jugador" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (s) => UUID.test(String(s));

// Lee el formulario tal cual vino (para devolverlo si hay un error).
export function leerFormEquipo(formData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    tag: String(formData.get("tag") ?? "").trim().toUpperCase(),
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    nivel: String(formData.get("nivel") ?? ""),
    rango_minimo: String(formData.get("rango_minimo") ?? ""),
    roles_buscados: formData.getAll("roles_buscados").map(String),
    idiomas: formData.getAll("idiomas").map(String),
    pais: String(formData.get("pais") ?? ""),
    zona_horaria: String(formData.get("zona_horaria") ?? ""),
    horarios: horariosDesdeFormData(formData),
    reclutando: formData.get("reclutando") === "on",
  };
}

// → { fila } lista para insert/update, o { error }.
export function validarEquipo(v) {
  if (v.nombre.length < 3 || v.nombre.length > 40) return { error: "El nombre debe tener de 3 a 40 caracteres." };
  if (v.tag && !/^[A-Z0-9]{2,5}$/.test(v.tag)) return { error: "El tag debe tener de 2 a 5 letras o números." };
  if (v.descripcion.length > 1000) return { error: "La descripción puede tener hasta 1000 caracteres." };
  if (!Object.hasOwn(NIVELES, v.nivel)) return { error: "Elegí el nivel del equipo." };
  if (v.rango_minimo && !esTier(v.rango_minimo)) return { error: "Rango mínimo inválido." };
  if (!v.roles_buscados.every((r) => Object.hasOwn(ROLES, r))) return { error: "Rol inválido." };
  if (!v.idiomas.every((i) => Object.hasOwn(IDIOMAS, i))) return { error: "Idioma inválido." };
  if (v.pais && !Object.hasOwn(PAISES, v.pais)) return { error: "País inválido." };
  if (!esZonaValida(v.zona_horaria)) return { error: "Elegí una zona horaria válida." };
  const horarios = normalizarHorarios(v.horarios);
  if (horarios.length !== v.horarios.length) {
    return { error: "Revisá los horarios: cada día marcado necesita hora de inicio y de fin distintas." };
  }

  return {
    fila: {
      nombre: v.nombre,
      tag: v.tag || null,
      descripcion: v.descripcion || null,
      nivel: v.nivel,
      rango_minimo: v.rango_minimo || null,
      roles_buscados: v.roles_buscados,
      idiomas: v.idiomas,
      pais: v.pais || null,
      zona_horaria: v.zona_horaria,
      horarios,
      reclutando: v.reclutando,
    },
  };
}

// Equipos donde el usuario es dueño o reclutador (los que pueden ver la compatibilidad).
export async function getEquiposStaff(supabase, usuarioId) {
  if (!usuarioId) return [];
  const { data } = await supabase
    .from("miembros_equipo")
    .select(
      "rol, equipos(id, nombre, tag, roles_buscados, rango_minimo, idiomas, horarios, zona_horaria)"
    )
    .eq("usuario_id", usuarioId)
    .in("rol", ["dueno", "reclutador"]);
  return (data ?? []).map((m) => m.equipos).filter(Boolean);
}
