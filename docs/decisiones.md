# Registro de decisiones

> Formato: `AAAA-MM-DD — Decisión — Motivo (1-2 líneas)`. Claude Code agrega una línea cada vez que se decide algo que el jurado podría preguntar.

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
