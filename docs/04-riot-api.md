# 04 — Riot API

> Antes de implementar, verificá cada endpoint en https://developer.riotgames.com/apis: Riot cambia endpoints y campos (por ejemplo, ya deprecó los `summonerId` en favor del `puuid`).

## Clave y límites
- Usamos una **clave de producción aprobada por Riot** (Production API Key, 7/11/2026). No vence.
- Header: `X-Riot-Token: <RIOT_API_KEY>`. **Solo en el servidor.**
- Los límites **no están escritos en el código**: el cliente los lee de los headers de cada respuesta (ver "Cliente"). Si Riot sube los límites de la clave, la app los usa sola.
- ⚠️ El `puuid` está encriptado **por aplicación**: al cambiar de clave cambian los `puuid` de todas las cuentas. Por eso existe `scripts/migrar-puuids.mjs` (re-resuelve cada cuenta por Riot ID).
- Respetar las políticas: https://developer.riotgames.com/policies/general (no vender datos, mostrar el disclaimer de Riot en el footer, etc.). Texto para el footer: *"[Nombre] no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc."*

## Routing
| Región (UI) | Plataforma (`plataforma`) | Routing regional |
|---|---|---|
| LAS | `la2` | `americas` |
| LAN | `la1` | `americas` |
| BR | `br1` | `americas` |
| NA | `na1` | `americas` |

- **Regional** (`americas.api.riotgames.com`): account-v1, match-v5.
- **Plataforma** (`la2.api.riotgames.com`): summoner-v4, league-v4, champion-mastery-v4.

## Endpoints que usamos
| Para qué | Endpoint | Host |
|---|---|---|
| Riot ID → puuid | `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | regional |
| Ícono y nivel | `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` | plataforma |
| Rango | `GET /lol/league/v4/entries/by-puuid/{puuid}` → filtrar `queueType === "RANKED_SOLO_5x5"` | plataforma |
| IDs de partidas | `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&count=30` | regional |
| Detalle de partida | `GET /lol/match/v5/matches/{matchId}` | regional |
| (opcional) Maestrías | `GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top?count=5` | plataforma |

`gameName` y `tagLine` van con `encodeURIComponent` (pueden tener espacios y tildes).

### Data Dragon (estático, sin key ni rate limit)
- Versión: `https://ddragon.leagueoflegends.com/api/versions.json` → `[0]`
- Campeones: `https://ddragon.leagueoflegends.com/cdn/{v}/data/es_AR/champion.json`
- Imagen de campeón: `.../cdn/{v}/img/champion/{championName}.png`
- Ícono de perfil: `.../cdn/{v}/img/profileicon/{id}.png`
- Emblemas de rango: no están en Data Dragon. Usar los assets oficiales de Riot o íconos propios del diseño.

## Cliente (`src/lib/riot/client.js`) — requisitos
- `riotFetch(url, metodo)` con un timeout de 8 s.
- **Rate limiter con límites leídos de los headers** (ventanas deslizantes en memoria):
  - `X-App-Rate-Limit` (ej. `100:120,20:1`) → un bucket por host (`americas`, `la2`...), porque Riot cuenta por región.
  - `X-Method-Rate-Limit` (ej. `2000:10`) → un bucket por host y por endpoint (`metodo` lo pasa `endpoints.js`).
  - `X-App-Rate-Limit-Count` / `X-Method-Rate-Limit-Count` → si Riot contó más requests que las que vio esta instancia (otra instancia de Vercel usó la clave), se suma la diferencia.
  - Antes de la primera respuesta se usa un valor conservador (`20:1,100:120`). Si la espera necesaria supera 10 s → `RATE_LIMITED` (no se cuelga la función).
- Partidas en paralelo: un pool con **5 como máximo** en curso.
- 429 → esperar `Retry-After` segundos (como máximo 1 reintento, y solo si es ≤ 10 s) y, si vuelve a fallar, devolver `RATE_LIMITED`.
- 401/403 → `KEY_INVALID` (clave rechazada) · 400/404 → `NOT_FOUND` · 5xx/timeout → `UNAVAILABLE`.
- Si `DEMO_MODE=true` o el error es `KEY_INVALID`/`UNAVAILABLE`, el sync devuelve lo cacheado con `{ stale: true }` y la UI muestra "Mostrando datos guardados".

## Verificación de cuenta (por ícono)
1. Se elige al azar un ícono base de **0 a 28** (los íconos iniciales que tienen todas las cuentas) distinto del actual. *Probar el día 2 con una cuenta real que esos IDs estén disponibles.*
2. Se guarda `icono_verificacion` y `verificacion_expira = now() + 15 min`.
3. La UI muestra la imagen del ícono con las instrucciones: "Cliente de LoL → tu perfil → cambiar ícono → elegí este".
4. "Verificar": summoner-v4 → si `profileIconId` coincide y no expiró → `verificada = true`, se limpian `icono_verificacion`/`verificacion_expira` y se borran los reclamos no verificados del mismo puuid hechos por otros usuarios.
5. Después el jugador puede volver a su ícono.

## Presupuesto de requests
- Primer sync: 1 (summoner) + 1 (league) + 1 (ids) + 30 (partidas) = **33**. La vinculación suma 2 (account + summoner).
- Re-sync con caché: 3 + solo las partidas nuevas (normalmente 0-3).
- Con un límite de app de 100 / 2 min entran ~3 primeros syncs cada 2 minutos → **el seed de la demo hay que correrlo de a poco** (el script espera entre cuentas). Si Riot asigna un límite mayor, el limiter lo toma de los headers.

## Extracción por partida (→ `partidas_jugador`)
De `info.participants[]`, para el participante con `puuid` = el nuestro:
- `championId`, `championName`, `teamPosition`, `win`, `kills`, `deaths`, `assists`
- `cs = totalMinionsKilled + neutralMinionsKilled`
- `vision = visionScore`, `oro = goldEarned`, `danio_campeones = totalDamageDealtToChampions`
- `participacion_kills = (kills + assists) / sum(kills de su team)` (si el team tiene 0 kills → 0)
- De `info`: `gameDuration` (segundos), `gameStartTimestamp`, `queueId`, `gameVersion`.
- **Remakes:** descartar si `gameDuration < 300` o `gameEndedInEarlySurrender`.

## Forma del resumen (`estadisticas_jugador.resumen`)
```json
{
  "partidas": 20,
  "victorias": 12,
  "winrate": 0.6,
  "kda": 3.4,
  "kills": 6.1, "deaths": 4.2, "assists": 8.2,
  "cs_min": 6.8,
  "vision_min": 1.1,
  "kp": 0.58,
  "por_rol": [{ "posicion": "UTILITY", "partidas": 14, "winrate": 0.64 }],
  "por_campeon": [{ "campeon": "Thresh", "campeon_id": 412, "partidas": 6, "winrate": 0.67, "kda": 4.1 }],
  "forma_reciente": ["W", "W", "L", "W", "L", "W", "W", "W", "L", "W"],
  "rol_principal": "UTILITY",
  "periodo": { "desde": "2026-10-20T...", "hasta": "2026-11-02T..." }
}
```
- `kda = (kills + assists) / max(1, deaths)` sobre los totales (no el promedio de los KDA).
- `por_campeon`: top 5 por cantidad de partidas.
- Con menos de 5 partidas: mostrar las stats con el aviso "muestra chica".
- `cs_min` para supports va a ser bajo: la comparación vs. el benchmark se hace por `posicion` cuando exista, y si no con `ALL`.
