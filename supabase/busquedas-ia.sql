-- =====================================================================
-- Caché de la búsqueda en lenguaje natural (T19) — correr en Supabase → SQL Editor.
-- Clave: el texto normalizado (minúsculas, sin tildes ni espacios de más).
-- Mismo pedido → mismos filtros, sin volver a llamar a Gemini.
-- Solo la escribe y la lee el servidor con la service role: RLS activado y SIN policies.
-- =====================================================================

create table if not exists public.busquedas_ia (
  texto_normalizado  text primary key check (char_length(texto_normalizado) between 1 and 300),
  filtros            jsonb not null,       -- salida de Gemini ya validada con zod
  modelo             text not null,
  usos               int not null default 1,
  creado_en          timestamptz not null default now(),
  usado_en           timestamptz not null default now()
);

alter table public.busquedas_ia enable row level security;
