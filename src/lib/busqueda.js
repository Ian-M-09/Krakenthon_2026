// Filtros del buscador ↔ query params de la URL (T17; la T19 los reutiliza desde el LLM).
// Pura: whitelist de todo lo que entra. Lo que no valida se descarta en silencio.
import { ROLES, IDIOMAS, PAISES } from "./catalogos";
import { esTier, TIERS } from "./rangos";
import { esUuid } from "./equipos";

const lista = (valor, valido) =>
  String(valor ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && valido(s));

// searchParams de Next (objeto plano) → filtros validados.
export function parsearFiltros(sp = {}) {
  const uno = (k) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  let rangoMin = esTier(uno("rangoMin")) ? uno("rangoMin") : null;
  let rangoMax = esTier(uno("rangoMax")) ? uno("rangoMax") : null;
  // Si vienen al revés, los damos vuelta.
  if (rangoMin && rangoMax && TIERS.indexOf(rangoMin) > TIERS.indexOf(rangoMax)) {
    [rangoMin, rangoMax] = [rangoMax, rangoMin];
  }
  return {
    roles: lista(uno("rol"), (r) => Object.hasOwn(ROLES, r)),
    rangoMin,
    rangoMax,
    idiomas: lista(uno("idioma"), (i) => Object.hasOwn(IDIOMAS, i)),
    paises: lista(uno("pais"), (p) => Object.hasOwn(PAISES, p)),
    verificados: uno("verificados") === "1",
    buscando: uno("buscando") === "1",
    equipo: esUuid(uno("equipo")) ? uno("equipo") : null,
  };
}

// filtros → "rol=UTILITY&rangoMin=EMERALD..." (solo lo que tiene valor).
export function aQueryString(f) {
  const p = new URLSearchParams();
  if (f.roles?.length) p.set("rol", f.roles.join(","));
  if (f.rangoMin) p.set("rangoMin", f.rangoMin);
  if (f.rangoMax) p.set("rangoMax", f.rangoMax);
  if (f.idiomas?.length) p.set("idioma", f.idiomas.join(","));
  if (f.paises?.length) p.set("pais", f.paises.join(","));
  if (f.verificados) p.set("verificados", "1");
  if (f.buscando) p.set("buscando", "1");
  if (f.equipo) p.set("equipo", f.equipo);
  return p.toString();
}

// Salida de la IA (schemaBusqueda) → filtros del buscador. Pasa otra vez por parsearFiltros para
// que todo lo que llega a la query tenga el mismo filtro de whitelist que los filtros manuales.
// La franja horaria la aplica la T19 cuando el buscador la soporte.
export function filtrosDesdeIA(ia, equipo = null) {
  return parsearFiltros({
    rol: ia.roles?.join(","),
    rangoMin: ia.rango_min ?? undefined,
    rangoMax: ia.rango_max ?? undefined,
    idioma: ia.idiomas?.join(","),
    pais: ia.paises?.join(","),
    verificados: ia.solo_verificados ? "1" : undefined,
    equipo: equipo ?? undefined,
  });
}

export const hayFiltros = (f) =>
  !!(f.roles.length || f.rangoMin || f.rangoMax || f.idiomas.length || f.paises.length || f.verificados || f.buscando);
