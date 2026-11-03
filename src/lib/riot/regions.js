// Plataformas soportadas y su routing regional (docs/04-riot-api.md → Routing).
// Sin "server-only": la UI lo usa para el select de región.
export const PLATAFORMAS = {
  la2: { label: "LAS", region: "americas" },
  la1: { label: "LAN", region: "americas" },
  br1: { label: "BR", region: "americas" },
  na1: { label: "NA", region: "americas" },
};

export const PLATAFORMA_DEFAULT = "la2";

export const esPlataformaValida = (p) => Object.hasOwn(PLATAFORMAS, p);

export const regionDe = (plataforma) => PLATAFORMAS[plataforma]?.region ?? "americas";

export const opcionesPlataforma = Object.entries(PLATAFORMAS).map(([valor, { label }]) => ({
  valor,
  label,
}));
