// Un helper por endpoint de Riot que usamos (docs/04-riot-api.md → Endpoints).
// Verificados contra developer.riotgames.com el 3/11/2026 con una cuenta real de LAS.
import "server-only";
import { riotFetch } from "./client";
import { regionDe } from "./regions";

const hostRegional = (plataforma) => `https://${regionDe(plataforma)}.api.riotgames.com`;
const hostPlataforma = (plataforma) => `https://${plataforma}.api.riotgames.com`;
const enc = encodeURIComponent;

export const COLA_RANKED_SOLO = 420;

// Riot ID → { puuid, gameName, tagLine }
export function getAccountByRiotId(plataforma, gameName, tagLine) {
  return riotFetch(
    `${hostRegional(plataforma)}/riot/account/v1/accounts/by-riot-id/${enc(gameName)}/${enc(tagLine)}`,
    "account-v1.by-riot-id"
  );
}

// → { puuid, profileIconId, summonerLevel, revisionDate }
export function getSummonerByPuuid(plataforma, puuid) {
  return riotFetch(
    `${hostPlataforma(plataforma)}/lol/summoner/v4/summoners/by-puuid/${enc(puuid)}`,
    "summoner-v4.by-puuid"
  );
}

// → entrada de RANKED_SOLO_5x5 o null si no tiene rango este split.
export async function getRankedSolo(plataforma, puuid) {
  const entries = await riotFetch(
    `${hostPlataforma(plataforma)}/lol/league/v4/entries/by-puuid/${enc(puuid)}`,
    "league-v4.entries-by-puuid"
  );
  return entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
}

// → ["LA2_123...", ...] de más nueva a más vieja.
export function getMatchIds(plataforma, puuid, count) {
  return riotFetch(
    `${hostRegional(plataforma)}/lol/match/v5/matches/by-puuid/${enc(puuid)}/ids?queue=${COLA_RANKED_SOLO}&count=${count}`,
    "match-v5.ids-by-puuid"
  );
}

export function getMatch(plataforma, matchId) {
  return riotFetch(`${hostRegional(plataforma)}/lol/match/v5/matches/${enc(matchId)}`, "match-v5.match");
}
