// Data Dragon: assets estáticos de LoL (sin key ni rate limit).
const BASE = "https://ddragon.leagueoflegends.com";
// Si versions.json no responde, usamos la última conocida (3/11/2026) para que las imágenes sigan andando.
const VERSION_FALLBACK = "16.21.1";
const TTL_MS = 6 * 60 * 60 * 1000;

let cache = { version: null, hasta: 0 };

export async function getVersion() {
  if (cache.version && Date.now() < cache.hasta) return cache.version;
  try {
    const res = await fetch(`${BASE}/api/versions.json`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const [ultima] = await res.json();
    cache = { version: ultima, hasta: Date.now() + TTL_MS };
    return ultima;
  } catch {
    return cache.version ?? VERSION_FALLBACK;
  }
}

export const urlIconoPerfil = (version, iconId) =>
  `${BASE}/cdn/${version}/img/profileicon/${iconId}.png`;

export const urlCampeon = (version, championName) =>
  `${BASE}/cdn/${version}/img/champion/${championName}.png`;
