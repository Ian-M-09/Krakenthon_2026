// Valores permitidos y sus labels en español. Sirve para la UI y para validar en el servidor
// (whitelist): en la BD se guardan los códigos, nunca el texto libre.

// Roles con los valores de Riot (teamPosition) → nombre en la UI.
export const ROLES = {
  TOP: "Top",
  JUNGLE: "Jungla",
  MIDDLE: "Mid",
  BOTTOM: "ADC",
  UTILITY: "Support",
};

// ISO 639-1
export const IDIOMAS = {
  es: "Español",
  pt: "Portugués",
  en: "Inglés",
};

// ISO 3166-1 alpha-2
export const PAISES = {
  AR: "Argentina",
  BO: "Bolivia",
  BR: "Brasil",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  EC: "Ecuador",
  SV: "El Salvador",
  GT: "Guatemala",
  HN: "Honduras",
  MX: "México",
  NI: "Nicaragua",
  PA: "Panamá",
  PY: "Paraguay",
  PE: "Perú",
  DO: "República Dominicana",
  UY: "Uruguay",
  VE: "Venezuela",
  US: "Estados Unidos",
  ES: "España",
};

export const TIPOS_CONTACTO = {
  discord: "Discord",
  email: "Email",
  whatsapp: "WhatsApp",
  otro: "Otro",
};

export const VISIBILIDADES = {
  publico: "Público (cualquiera)",
  equipos: "Solo miembros de equipos registrados",
  oculto: "Oculto",
};

export const aOpciones = (catalogo) =>
  Object.entries(catalogo).map(([valor, label]) => ({ valor, label }));
