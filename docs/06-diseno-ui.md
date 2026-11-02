# 06 — Diseño y UI

> ⏳ **Pendiente:** la paleta, las tipografías, el logo y el estilo los entrega el equipo de marketing/diseño. Cuando lleguen, completar la sección "Sistema de diseño" y ejecutar la T21.

## Regla mientras tanto
Se construye con **tokens semánticos** y nunca con colores sueltos (`bg-purple-600`). Cuando llegue el diseño se cambian los valores en `src/app/globals.css` y toda la app se actualiza sola.

```css
/* src/app/globals.css — valores PROVISORIOS (oscuro neutro) */
:root {
  --color-bg: #0b0d12;
  --color-surface: #141821;
  --color-surface-2: #1c2230;
  --color-border: #2a3142;
  --color-text: #e8ecf3;
  --color-text-muted: #8a93a6;
  --color-accent: #4f8cff;      /* reemplazar por el color de marca */
  --color-success: #22c55e;     /* victoria / verificado */
  --color-danger: #ef4444;      /* derrota / error */
  --color-warning: #f59e0b;
}
```
Clases a usar: `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-text`, `text-muted`, `text-accent`, `bg-accent`, `text-success`, `text-danger`. *(Configurarlas en Tailwind según la versión que instale create-next-app: con v4 se usa `@theme` en el CSS; con v3, `theme.extend.colors` en `tailwind.config.js`.)*

## Pantallas (wireframe funcional)
| Ruta | Contenido mínimo |
|---|---|
| `/` | Landing: propuesta de valor, CTA "Crear perfil" / "Buscar jugadores" |
| `/login`, `/registro` | Formularios simples con errores visibles |
| `/onboarding` | Nombre de usuario + "¿Buscás equipo o jugadores?" (2 cards grandes) |
| `/perfil/vincular` | Paso 1: Riot ID + región · Paso 2: ícono a poner + "Verificar" · estado |
| `/jugadores/[usuario]` | Header (ícono, Riot ID, rango, badge verificado) · stats cards · campeones · roles · forma reciente · vs. rango · datos declarados · contacto · informe IA · % de compatibilidad (si sos reclutador) |
| `/perfil/editar` | Formulario de datos declarados + editor de horarios por día |
| `/jugadores` | Input de lenguaje natural + chips · filtros laterales · grilla de cards de jugador |
| `/equipos`, `/equipos/nuevo`, `/equipos/[id]` | Listado · formulario · detalle con miembros y roles buscados |
| `/torneos...` | P5 |

## Componentes base (`src/components/ui/`)
Button (primario/secundario/ghost, loading), Card, Badge (verificado, rol, rango), Input, Select, MultiSelect (chips), Spinner/Skeleton, EmptyState, ErrorState, Tabs, ProgressBar (compatibilidad), Avatar (ícono de perfil).

## Requisitos de UX (puntúan)
- Cada acción async tiene estado de carga, de éxito y de error.
- Estados vacíos con una acción ("Todavía no vinculaste tu cuenta → Vincular").
- Responsive desde 360 px.
- Accesibilidad básica: labels en los inputs, contraste, foco visible.

## Sistema de diseño (completar cuando llegue)
- Paleta: …
- Tipografías: …
- Logo / nombre del producto: …
- Referencias de estilo: …
