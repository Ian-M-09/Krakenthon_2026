// Filtros del buscador ↔ query params de la URL (T17; la T19 los reutiliza desde el LLM).
// Pura: whitelist de todo lo que entra. Lo que no valida se descarta en silencio.
import { ROLES, IDIOMAS, PAISES } from "./catalogos";
import { esTier, TIERS, LABEL_TIER } from "./rangos";
import { esUuid } from "./equipos";
import { esZonaValida, aIntervalosUTC, minutosSuperpuestos, DIAS_CORTOS } from "./horarios";

const lista = (valor, valido) =>
  String(valor ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && valido(s));

const HORA = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const ZONA_DEFAULT = "America/Argentina/Buenos_Aires";

// searchParams de Next (objeto plano) → filtros validados.
export function parsearFiltros(sp = {}) {
  const uno = (k) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  let rangoMin = esTier(uno("rangoMin")) ? uno("rangoMin") : null;
  let rangoMax = esTier(uno("rangoMax")) ? uno("rangoMax") : null;
  // Si vienen al revés, los damos vuelta.
  if (rangoMin && rangoMax && TIERS.indexOf(rangoMin) > TIERS.indexOf(rangoMax)) {
    [rangoMin, rangoMax] = [rangoMax, rangoMin];
  }
  // Franja horaria (T19): "desde"/"hasta" en la zona `tz` de quien busca; días 0 = lunes.
  const desde = HORA.test(uno("desde") ?? "") ? uno("desde") : null;
  const hasta = HORA.test(uno("hasta") ?? "") ? uno("hasta") : null;
  const franja =
    desde && hasta && desde !== hasta
      ? {
          desde,
          hasta,
          dias: [...new Set(lista(uno("dias"), (d) => /^[0-6]$/.test(d)).map(Number))].sort(),
        }
      : null;
  return {
    roles: lista(uno("rol"), (r) => Object.hasOwn(ROLES, r)),
    rangoMin,
    rangoMax,
    idiomas: lista(uno("idioma"), (i) => Object.hasOwn(IDIOMAS, i)),
    paises: lista(uno("pais"), (p) => Object.hasOwn(PAISES, p)),
    verificados: uno("verificados") === "1",
    buscando: uno("buscando") === "1",
    equipo: esUuid(uno("equipo")) ? uno("equipo") : null,
    franja,
    tz: esZonaValida(uno("tz") ?? "") && uno("tz") ? uno("tz") : ZONA_DEFAULT,
    ia: uno("ia") === "1",
    q: String(uno("q") ?? "").slice(0, 300),
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
  if (f.franja) {
    p.set("desde", f.franja.desde);
    p.set("hasta", f.franja.hasta);
    if (f.franja.dias?.length) p.set("dias", f.franja.dias.join(","));
  }
  if (f.franja && f.tz) p.set("tz", f.tz);
  if (f.ia) p.set("ia", "1");
  if (f.q) p.set("q", f.q);
  return p.toString();
}

// Salida de la IA (schemaBusqueda) → filtros del buscador. Pasa otra vez por parsearFiltros para
// que todo lo que llega a la query tenga el mismo filtro de whitelist que los filtros manuales.
export function filtrosDesdeIA(ia, { equipo, tz, texto } = {}) {
  return parsearFiltros({
    rol: ia.roles?.join(","),
    rangoMin: ia.rango_min ?? undefined,
    rangoMax: ia.rango_max ?? undefined,
    idioma: ia.idiomas?.join(","),
    pais: ia.paises?.join(","),
    verificados: ia.solo_verificados ? "1" : undefined,
    equipo: equipo ?? undefined,
    desde: ia.franja?.desde ?? undefined,
    hasta: ia.franja?.hasta ?? undefined,
    dias: ia.franja?.dias?.join(","),
    tz,
    ia: "1",
    q: texto,
  });
}

export const hayFiltros = (f) =>
  !!(
    f.roles.length || f.rangoMin || f.rangoMax || f.idiomas.length || f.paises.length ||
    f.verificados || f.buscando || f.franja
  );

// ¿El jugador tiene algún horario que se superponga con la franja buscada? (todo pasado a UTC)
export function juegaEnFranja(jugador, franja, tz, fecha = new Date()) {
  if (!jugador.horarios?.length) return false;
  const dias = franja.dias.length ? franja.dias : [0, 1, 2, 3, 4, 5, 6];
  // "24:00" = medianoche: en horarios.js un fin <= inicio significa "termina al día siguiente".
  const hasta = franja.hasta === "24:00" ? "00:00" : franja.hasta;
  const desde = franja.desde === "24:00" ? "00:00" : franja.desde;
  const buscada = aIntervalosUTC(dias.map((dia) => ({ dia, desde, hasta })), tz, fecha);
  const delJugador = aIntervalosUTC(jugador.horarios, jugador.zona_horaria, fecha);
  return minutosSuperpuestos(delJugador, buscada) > 0;
}

// Chips "Entendí: Support · Esmeralda+ · Español · Noche". Cada chip trae el link que lo saca.
export function chipsDeFiltros(f) {
  const sin = (cambio) => `/jugadores?${aQueryString({ ...f, ...cambio })}`;
  const chips = [];
  for (const r of f.roles) chips.push({ label: ROLES[r], href: sin({ roles: f.roles.filter((x) => x !== r) }) });
  if (f.rangoMin) chips.push({ label: `${LABEL_TIER[f.rangoMin]}+`, href: sin({ rangoMin: null }) });
  if (f.rangoMax) chips.push({ label: `Hasta ${LABEL_TIER[f.rangoMax]}`, href: sin({ rangoMax: null }) });
  for (const i of f.idiomas) chips.push({ label: IDIOMAS[i], href: sin({ idiomas: f.idiomas.filter((x) => x !== i) }) });
  for (const p of f.paises) chips.push({ label: PAISES[p], href: sin({ paises: f.paises.filter((x) => x !== p) }) });
  if (f.franja) {
    const dias = f.franja.dias.length ? `${f.franja.dias.map((d) => DIAS_CORTOS[d]).join(", ")} ` : "";
    chips.push({ label: `${dias}${f.franja.desde}–${f.franja.hasta}`, href: sin({ franja: null }) });
  }
  if (f.verificados) chips.push({ label: "Verificados", href: sin({ verificados: false }) });
  if (f.buscando) chips.push({ label: "Buscando equipo", href: sin({ buscando: false }) });
  return chips;
}
