# CLAUDE.md — Contexto para Claude Code

## Proyecto
Plataforma web de **identidad competitiva verificada + scouting de jugadores** para equipos amateur y semi-pro de esports (foco LATAM). Se arranca solo con **League of Legends** (Riot API). Proyecto para la **KRANKETHON 2026 (Salta Gaming + IDEA), Track 2: Economía Digital, UGC y Comunidad**.

- Programador único: **Ian** (estudiante de ingeniería en informática). Entiende el código cuando lo lee, pero Claude escribe la mayor parte, e Ian lo integra, lo prueba y lo commitea.
- **Entrega: lunes 9/11/2026** → link al repo + versión desplegada en Vercel + documento de pitch y roadmap.
- Pitch: 14/11/2026.

## Cómo trabajar con Ian (obligatorio)
1. **Empezá cada respuesta con "Ian".** Respondé en español rioplatense.
2. Al iniciar una sesión, leé `docs/00-plan.md`, fijate qué día es y cuál es la próxima tarea sin tildar. Decíselo a Ian en una línea.
3. **Antes de una feature grande, proponé un plan corto (archivos que vas a crear o tocar y los pasos) y esperá el OK.**
4. Código completo y listo para usar, siempre con la ruta exacta del archivo. Nada de "acá va el resto".
5. Explicá en 2-3 líneas cada decisión importante: el jurado le va a hacer preguntas técnicas a Ian y tiene que poder defenderlas con sus propias palabras.
6. **Que funcione y sea estable por sobre lo sofisticado.** Si algo pone en riesgo la demo, avisá.
7. Al terminar cada tarea: tildala en `docs/00-plan.md`, anotá cualquier decisión en `docs/decisiones.md` y sugerí un mensaje de commit (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `style:`).
8. No inventes datos de la Riot API ni promedios de rango: si falta un dato, pedíselo a Ian o marcalo como TODO.
9. Respetá el alcance de `docs/01-alcance-demo.md`. Lo que está "fuera de alcance" no se hace sin el OK de Ian.

## Stack (no cambiar sin una razón muy fuerte)
- Next.js (App Router) + React + **JavaScript** (no TypeScript) + Tailwind CSS
- Supabase: PostgreSQL + Auth + Storage (`@supabase/supabase-js` + `@supabase/ssr`)
- Gemini API (`@google/genai`), con el modelo configurable por `GEMINI_MODEL`
- Deploy en Vercel, Git + GitHub

## Reglas de seguridad y arquitectura
- **La `RIOT_API_KEY`, la `GEMINI_API_KEY` y la `SUPABASE_SERVICE_ROLE_KEY` solo se usan en el servidor** (route handlers o server actions). Nunca con el prefijo `NEXT_PUBLIC_`.
- Las tablas de stats y de cuentas Riot **solo las escribe el servidor con la service role**. El cliente no tiene policies de escritura, así que el jugador no puede editar sus stats: ese es el diferencial del producto.
- El LLM **nunca genera SQL**: devuelve JSON con filtros, se valida y después la query la arma el código.
- Todo lo de la Riot API pasa por `src/lib/riot/` con caché en Supabase (ver `docs/04-riot-api.md`).
- Cada llamada externa (Riot y Gemini) tiene manejo de errores y un mensaje amigable en la UI. La demo no puede romperse.

## Diseño (pendiente)
La paleta y el estilo los entrega marketing más adelante. Hasta entonces: **primero lo funcional**, con UI simple que use solo los tokens semánticos de `docs/06-diseno-ui.md` (`bg-surface`, `text-accent`...). Nunca colores sueltos de Tailwind. No inviertas tiempo en lo estético hasta la T21.

## Documentación
| Archivo | Para qué |
|---|---|
| `docs/00-plan.md` | Plan día por día con checkboxes (la fuente de verdad del progreso) |
| `docs/01-alcance-demo.md` | Qué entra en la demo, criterios de aceptación y qué queda afuera |
| `docs/02-arquitectura.md` | Estructura de carpetas, flujos y decisiones técnicas |
| `docs/03-base-de-datos.md` | Modelo de datos y RLS (el SQL está en `supabase/schema.sql`) |
| `docs/04-riot-api.md` | Endpoints, rate limits, caché, verificación de cuenta y cálculo de stats |
| `docs/05-ia-gemini.md` | Las 3 features de IA: prompts y esquemas JSON |
| `docs/06-diseno-ui.md` | Sistema de diseño y pantallas |
| `docs/07-entrega.md` | Checklist del 9/11, README, guion de la demo y pitch |
| `docs/decisiones.md` | Registro de decisiones (se va completando) |

## Comandos
```bash
npm run dev      # desarrollo en http://localhost:3000
npm run build    # siempre antes de pushear algo grande: Vercel falla si el build falla
npm run lint
```

## Variables de entorno
Ver `.env.example`. En Vercel se cargan en Settings → Environment Variables.
**La dev key de Riot vence cada 24 h**: hay que renovarla en developer.riotgames.com, actualizarla en `.env.local` y en Vercel, y redeployar.
