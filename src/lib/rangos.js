// Orden de tiers, labels en español y valor ordenable para filtros ("Esmeralda+").
// Funciones puras: no importan nada de Next ni de Supabase.
export const TIERS = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND",
  "MASTER", "GRANDMASTER", "CHALLENGER",
];

export const LABEL_TIER = {
  IRON: "Hierro",
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  PLATINUM: "Platino",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Maestro",
  GRANDMASTER: "Gran Maestro",
  CHALLENGER: "Retador",
};

const DIVISIONES = ["IV", "III", "II", "I"];
const TIERS_APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

// tier * 10000 + división * 1000 + LP. El salto de 10000 por tier hace que un Maestro con
// muchos LP nunca quede por encima del mínimo de Gran Maestro. null = sin rango.
export function rangoValor(tier, division, lp = 0) {
  const t = TIERS.indexOf(tier);
  if (t === -1) return null;
  const d = TIERS_APEX.has(tier) ? 0 : Math.max(0, DIVISIONES.indexOf(division));
  return t * 10000 + d * 1000 + Math.min(Math.max(lp ?? 0, 0), 9999);
}

// Posición en "escalones de división": Hierro IV = 0, Hierro III = 1 ... Diamante I = 27,
// Maestro = 28, Gran Maestro = 29, Retador = 30. Sirve para "a cuántas divisiones está".
export function indiceDivision(tier, division = "IV") {
  const t = TIERS.indexOf(tier);
  if (t === -1) return null;
  if (TIERS_APEX.has(tier)) return 28 + (t - TIERS.indexOf("MASTER"));
  return t * 4 + Math.max(0, DIVISIONES.indexOf(division));
}

// Valor máximo de un tier (para filtrar "hasta Diamante").
export const maximoTier = (tier) => {
  const t = TIERS.indexOf(tier);
  return t === -1 ? null : t * 10000 + 9999;
};

export const esTier = (t) => TIERS.includes(t);

// Valor mínimo de un tier, para filtrar "rango_valor >= minimoTier('EMERALD')".
export const minimoTier = (tier) => rangoValor(tier, "IV", 0);

// "Bronce III · 82 LP" / "Maestro · 312 LP" / "Sin rango"
export function labelRango(tier, division, lp) {
  if (!tier) return "Sin rango";
  const nombre = LABEL_TIER[tier] ?? tier;
  const div = TIERS_APEX.has(tier) ? "" : ` ${division}`;
  return `${nombre}${div} · ${lp ?? 0} LP`;
}
