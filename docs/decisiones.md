# Registro de decisiones

> Formato: `AAAA-MM-DD — Decisión — Motivo (1-2 líneas)`. Se agrega una línea cada vez que se decide algo que el jurado podría preguntar.

- 2026-11-02 — Next.js full-stack + Supabase + Gemini, en JavaScript — Stack que Ian ya domina; un repo y un deploy para un solo dev.
- 2026-11-02 — Solo LoL (cola 420, últimas 20 partidas) en la demo — Acotar para que sea estable; Valorant/CS2 van al roadmap.
- 2026-11-02 — Verificación de cuenta por ícono de perfil — Sin production key no hay RSO; prueba el control de la cuenta.
- 2026-11-02 — Las tablas verificadas solo las escribe el servidor (service role) — El jugador no puede alterar sus stats: es el diferencial del producto.
- 2026-11-02 — Contacto en una tabla aparte con RLS por visibilidad — RLS filtra filas, no columnas.
- 2026-11-02 — Caché de partidas inmutables en Postgres — Rate limit de Riot, velocidad y resiliencia de la demo.
- 2026-11-02 — El LLM devuelve JSON validado y nunca SQL — Seguridad ante la inyección por prompt.
- 2026-11-02 — Compatibilidad con un algoritmo determinístico — Explicable, instantáneo y estable.
- 2026-11-02 — UI con tokens semánticos hasta que llegue el diseño de marketing — Se cambia un solo archivo.
- 2026-11-02 — Next.js 16 + React 19 + Tailwind v4 (lo que trae create-next-app) — Tailwind v4 no usa tailwind.config: los tokens de la T06 van en `@theme` dentro de `globals.css`.
- 2026-11-02 — Supabase en us-east-1 en vez de São Paulo — Queda al lado de las funciones de Vercel (iad1 por defecto), así que la latencia servidor→DB es mínima; no vale la pena recrear el proyecto.
- 2026-11-02 — `src/proxy.js` en vez de `middleware.js` — En Next 16 el middleware pasó a llamarse Proxy; la lógica de sesión vive en `src/lib/supabase/proxy.js`.
- 2026-11-02 — Se mantiene `cacheComponents` de Next 16 y lo que lee cookies/searchParams va dentro de <Suspense> — La parte estática se prerenderiza y la sesión se streamea; desactivarlo era más fácil pero perdíamos performance.
- 2026-11-02 — Auth con server actions + useActionState — Validación en el servidor, sin endpoints extra y errores traducidos en la UI.
- 2026-11-03 — Rate limiter propio (ventanas deslizantes 20/s y 100/2 min) en vez de `bottleneck` — Una dependencia menos y es poco código; igual cada instancia de Vercel tiene el suyo, así que el respaldo real es el manejo del 429.
- 2026-11-03 — Ante un 429 se reintenta una vez solo si `Retry-After` ≤ 10 s — Esperar más dejaría colgada la función serverless; mejor devolver `RATE_LIMITED` y mostrar lo cacheado.
- 2026-11-03 — `rango_valor = tier*10000 + división*1000 + LP` — El salto de 10000 por tier hace que un Maestro con muchos LP nunca supere el mínimo de Gran Maestro en los filtros.
- 2026-11-03 — Si Riot falla (cualquier `RiotError`) el sync devuelve `estado: "stale"` con lo guardado — La demo no se rompe aunque se venza la key o la API esté saturada.
- 2026-11-03 — Los remakes se guardan en `partidas` (caché) pero no en `partidas_jugador` — No se vuelven a pedir a Riot en cada sync y no ensucian las stats.
- 2026-11-03 — Si una partida ya está en caché porque la trajo otro jugador, se extrae nuestra fila desde `partidas.datos` — Cero requests extra cuando dos jugadores de la plataforma jugaron juntos.
- 2026-11-03 — El sync también llama a summoner-v4 (1 request más) — Mantiene actualizados el ícono y el nivel que muestra el perfil.
- 2026-11-03 — Verificar dispara el primer sync con `force`; si el sync falla, la verificación igual queda hecha — Son cosas independientes y la verificación es lo que importa.
- 2026-11-03 — `await connection()` en `createClient()` del servidor — Con Partial Prefetching, Next pre-renderiza lo que lee cookies y prohíbe `Date.now()`, que Supabase usa para validar el token. Todo lo que usa la sesión pasa a renderizarse en el request (igual es por usuario).
- 2026-11-03 — Las stats se recalculan desde la BD (`partidas_jugador`) al final de cada sync, y también en cooldown/stale si la cuenta todavía no tiene resumen — No gastan requests de Riot y el perfil nunca queda vacío si hay partidas en caché.
- 2026-11-03 — Benchmarks estimados en `supabase/seed-benchmarks.sql` (ALL + JUNGLE + UTILITY por tier, `fuente='estimado'`) — Jungla y support tienen CS/visión muy distintos; la UI aclara que son referencias estimadas y no promedios oficiales.
- 2026-11-03 — CS/min y visión/min sobre minutos totales; KP como promedio por partida — Ponderar por duración evita que una partida corta distorsione el promedio.
- 2026-11-03 — Horarios: `dia` 0 = lunes; conversión con `Intl` (sin librerías) usando el offset del momento — Respeta el horario de verano y se hace en el navegador porque es el único lugar donde se conoce la zona del visitante.
- 2026-11-03 — La edición del perfil (T13) solo escribe `perfiles_jugador` y `contactos_jugador`, con validación por whitelist en la server action — Las stats y la cuenta de Riot no tienen policies de escritura: aunque alguien manipule el form, el RLS lo rechaza.
