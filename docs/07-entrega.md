# 07 — Entrega (9/11) y demo

## Checklist del 9/11
- [ ] Repo público en GitHub, con la rama `main` limpia y el tag `v0.1.0-entrega`.
- [ ] Deploy en Vercel funcionando desde una ventana de incógnito.
- [ ] Key de Riot vigente en Vercel (si es dev key, renovada ese día).
- [ ] Cuentas de demo con el caché precalentado y los informes IA ya generados.
- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Sin secretos en el repo (`git log -p | grep -i "key"` para revisar) y `.env.local` en `.gitignore`.
- [ ] README completo (abajo).
- [ ] Documento de pitch + roadmap entregado por el equipo, con la sección técnica de Ian (arquitectura, estado del arte, cuellos de botella).
- [ ] Disclaimer de Riot en el footer.

## README — estructura
1. Nombre + tagline + captura principal (GIF corto del flujo).
2. Problema y propuesta de valor (3-4 líneas).
3. Demo: link al deploy + usuario de prueba.
4. Funcionalidades (con capturas).
5. Cómo usa la IA (las 3 features y sus principios).
6. Stack.
7. Arquitectura (Mermaid de `02-arquitectura.md`) + modelo de datos.
8. Correrlo local: requisitos, `npm i`, `.env.local` (tabla de variables), `schema.sql`, `npm run dev`.
9. Decisiones técnicas (resumen de `docs/decisiones.md`).
10. Roadmap (resumen).
11. Equipo + disclaimer de Riot.

## Guion de la demo (3-4 min)
1. Landing → registro con una cuenta nueva → onboarding "Busco equipo".
2. Vincular un Riot ID real → mostrar el paso del ícono (tener uno **ya verificado** de respaldo).
3. Perfil: stats, campeones, forma reciente, vs. rango → "esto no se puede editar".
4. Informe de scouting IA (ya cacheado → aparece al instante; mostrar "regenerar" solo si hay tiempo).
5. Cambiar a la cuenta de reclutador → equipo creado → búsqueda en lenguaje natural con la frase de ejemplo → chips → resultados con %.
6. Abrir el perfil → contacto visible porque es equipo → desglose de compatibilidad.
7. (Si llega) Torneo: depositar → publicar → ganador → liberar pago − comisión.
8. Cierre: roadmap (Valorant, CS2, RSO, pagos reales).

**Plan B:** si falla internet o el deploy, tener un video grabado del guion completo (grabarlo el 8/11 a la noche).

## Insumos técnicos para el documento de roadmap
- **Cuellos de botella:** el rate limit de Riot (→ production key + sync en background con cola), los costos y límites de Gemini (→ caché + rate limit por usuario), la verificación por ícono (→ RSO), los benchmarks estimados (→ calcularlos con datos propios).
- **Infraestructura:** Vercel + Supabase (free → pro), cron de sync (Vercel Cron / Supabase pg_cron), colas, observabilidad (logs, Sentry).
- **Evolución:** Valorant (Riot API con RSO), CS2 (Steam Web API + FACEIT), torneos con pagos divididos (Mercado Pago Marketplace), reputación de equipos, mobile.
- **Reglas de Riot para torneos con premios:** revisar las políticas de torneos comunitarios antes de lanzar premios reales.
