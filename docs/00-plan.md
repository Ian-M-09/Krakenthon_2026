# 00 — Plan de trabajo (2/11 → 9/11)

> Fuente de verdad del progreso. Claude Code: al terminar una tarea, tildala `[x]` y sumá una línea en `docs/decisiones.md` si se tomó alguna decisión.
> Cada tarea tiene su ID (T01, T02...). Para pedirla: *"Hacé la T08 según docs/00-plan.md"*.

## Reglas del plan
- **Primero lo funcional y después lo estético.** La paleta y el diseño los traen los chicos de marketing/diseño (ver `06-diseno-ui.md`). Hasta entonces, la UI se arma con Tailwind usando **tokens semánticos** (`bg-surface`, `text-accent`...) para que el diseño se aplique cambiando un solo archivo.
- **Deploy temprano y seguido**: Vercel tiene que andar desde el día 1, no el 9/11.
- **Feature freeze: domingo 8/11 a las 20:00.** Después de eso, solo fixes, README y capturas.
- Si un día se atrasa, se corre la prioridad 5 (torneos) y nunca la 1-3.
- Cada tarea termina con `npm run build` sin errores y un commit.

## Prioridades (del alcance)
1. Auth + vinculación de cuenta LoL verificada
2. Perfil del jugador con stats verificadas + datos declarados
3. Informe de scouting con IA
4. Equipos + buscador (filtros + lenguaje natural + compatibilidad)
5. Torneos (flujo simple simulado) — solo si sobra tiempo

---

## Día 1 — Lunes 2/11 (presencial) · Base del proyecto
- [ ] **T00** Registrar el producto en developer.riotgames.com para pedir una **Personal API Key** (no vence cada 24 h). Puede tardar en aprobarse, así que conviene hacerlo HOY. Mientras tanto se usa la dev key.
- [ ] **T01** Crear el repo en GitHub y el proyecto Next.js: `npx create-next-app@latest` → JavaScript, ESLint, Tailwind, `src/`, App Router, alias `@/*`. Copiar `CLAUDE.md`, `docs/`, `supabase/` y `.env.example`. Commit: `chore: inicializa proyecto Next.js y documentación de planificación`
- [ ] **T02** Crear el proyecto en Supabase (región São Paulo), correr `supabase/schema.sql` en el SQL Editor y, en Auth, habilitar email+password con la confirmación de email **desactivada** (para no trabar la demo).
- [ ] **T03** Clientes de Supabase (`src/lib/supabase/client.js`, `server.js`, `admin.js`) + `src/middleware.js` que refresca la sesión y protege rutas.
- [ ] **T04** Deploy en Vercel con las variables de entorno. Una página "hola" online = deploy funcionando.
- [ ] **T05** Login / registro / logout + `/onboarding` (elegir `nombre_usuario` y "¿venís a buscar equipo o jugadores?"). Si el usuario no tiene fila en `perfiles`, el middleware lo manda a `/onboarding`.
- [ ] **T06** Layout base: navbar (Jugadores · Equipos · Torneos · Mi perfil), tokens de diseño provisionales en `globals.css` + `tailwind.config`, y componentes mínimos en `src/components/ui/` (Button, Card, Badge, Input, Select, Spinner, EmptyState, ErrorState).

## Día 2 — Martes 3/11 (presencial) · Riot API
- [ ] **T07** `src/lib/riot/client.js`: fetch con `X-Riot-Token`, rate limit en memoria, reintento ante 429 respetando `Retry-After`, timeout y errores tipados (`NOT_FOUND`, `RATE_LIMITED`, `KEY_INVALID`, `UNAVAILABLE`). + `regions.js` y `endpoints.js`.
- [ ] **T08** Vincular cuenta (`/perfil/vincular`): formulario con Riot ID (`Nombre#TAG`) y región → el servidor resuelve el `puuid` → guarda en `cuentas_riot` con `verificada=false` y le asigna un ícono de verificación al azar.
- [ ] **T09** Verificar la cuenta: el jugador se pone ese ícono en el cliente de LoL → botón "Verificar" → el servidor compara `profileIconId` → `verificada=true` (ver `04-riot-api.md`). También se puede "Verificar después" (el perfil muestra el badge "no verificada").
- [ ] **T10** `src/lib/riot/sync.js`: sincroniza rango, IDs de partidas y **solo** las partidas nuevas → `partidas` + `partidas_jugador`. Cooldown de 10 min por cuenta. Endpoint `POST /api/riot/sincronizar`.

## Día 3 — Miércoles 4/11 (presencial, cierre) · Perfil
- [ ] **T11** `src/lib/stats.js` (funciones puras): winrate, por campeón y por rol, KDA, CS/min, visión/min, kill participation, forma reciente (últimas 10). Guarda el resumen en `estadisticas_jugador`. Seed de `benchmarks_rango` marcado como `fuente='estimado'`.
- [ ] **T12** Perfil público `/jugadores/[nombre_usuario]`: header (ícono, Riot ID, rango, badge verificado, "actualizado hace X"), cards de stats, tabla por campeón, distribución por rol, forma reciente, comparación vs. su rango y datos declarados.
- [ ] **T13** Editar datos declarados (`/perfil/editar`): país, idiomas, roles, horarios + zona horaria, bio, contacto + visibilidad. Los horarios se muestran **convertidos a la zona horaria del que mira** (`src/lib/horarios.js`).
- [ ] 🎯 **Hito día 3:** registro → vincular → verificar → ver perfil con stats reales, en producción.

## Día 4 — Jueves 5/11 (remoto) · IA: informe de scouting
- [ ] **T14** `src/lib/ia/gemini.js`: wrapper con timeout, salida JSON con `responseSchema`, validación y errores amigables.
- [ ] **T15** Informe de scouting (`POST /api/ia/informe`): genera desde `estadisticas_jugador` + `benchmarks_rango` y lo cachea en `informes_ia` por hash de stats. UI: sección "Informe de scouting IA" en el perfil, con botón de generar/regenerar y estado de carga.

## Día 5 — Viernes 6/11 (remoto) · Equipos + buscador
- [ ] **T16** Equipos: crear (`/equipos/nuevo`), ver (`/equipos/[id]`), editar y gestionar miembros (agregar por `nombre_usuario` con rol dueño/reclutador/jugador, quitar, salir). Listado `/equipos`.
- [ ] **T17** Buscador de jugadores `/jugadores`: filtros por rol, rango mín/máx, idioma, país, "solo verificados" y "buscando equipo". Filtros en la URL (`?rol=UTILITY&rangoMin=EMERALD`) y query en el servidor sobre `vista_jugadores`.
- [ ] **T18** `src/lib/compatibilidad.js` (algoritmo determinístico, ver `05-ia-gemini.md`) → el % se muestra en los resultados y en el perfil si el usuario que mira es dueño/reclutador de un equipo.

## Día 6 — Sábado 7/11 (remoto) · Lenguaje natural + diseño
- [ ] **T19** Búsqueda en lenguaje natural: input arriba del buscador → `POST /api/ia/busqueda` → filtros JSON validados → redirige a `/jugadores?...` (reutiliza T17). Se muestran como chips editables "Entendí: Support · Esmeralda+ · Español · Noche".
- [ ] **T20** Solicitudes equipo ↔ jugador (invitar / postularse, aceptar / rechazar). *Opcional si el día viene justo.*
- [ ] **T21** Aplicar el diseño de marketing: reemplazar los tokens, tipografías, logo y pulir las pantallas principales. **Depende de que llegue el diseño.**
- [ ] **T22** Script de seed para la demo (`scripts/seed-demo.mjs`): cuentas del equipo (con su permiso) + 2-3 equipos de ejemplo, para que el buscador no se vea vacío.

## Día 7 — Domingo 8/11 (remoto) · Torneos, pulido y README · FREEZE 20:00
- [ ] **T23** Torneos (flujo simple): crear torneo → "depositar premio" (sandbox/simulado) → publicar → inscribir equipos → declarar ganador → "liberar pago − comisión". Estados en `torneos.estado`. Si no da el tiempo: pantalla mockup + roadmap.
- [ ] **T24** Pasada de robustez: loading/empty/error en todas las pantallas, responsive mobile, 404 propia, `DEMO_MODE` probado (con la Riot API caída se sigue viendo lo cacheado).
- [ ] **T25** Tests con Vitest para `stats.js`, `compatibilidad.js` y `horarios.js` (funciones puras: es rápido y suma en calidad del repo).
- [ ] **T26** README completo (ver `07-entrega.md`) + diagrama de arquitectura (Mermaid) + capturas.

## Día 8 — Lunes 9/11 · ENTREGA
- [ ] **T27** Smoke test en producción con el guion de la demo (`07-entrega.md`). Renovar la key de Riot si es dev key.
- [ ] **T28** Tag `v0.1.0-entrega`, verificar que el repo sea público y entregar: link al repo, link al deploy y el doc de pitch + roadmap (lo arma el equipo; Ian aporta la sección técnica).

## Del 10 al 14/11 · Antes del pitch
- [ ] Ensayar la demo 3 veces desde una cuenta nueva.
- [ ] El 14/11 a la mañana: renovar la key de Riot, redeploy y precalentar el caché de los perfiles que se van a mostrar.
- [ ] Preparar las respuestas técnicas (ver "Preguntas probables del jurado" en `02-arquitectura.md`).
