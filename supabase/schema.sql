-- =====================================================================
-- KRANKETHON 2026 — Esquema inicial
-- Correr completo en Supabase → SQL Editor (proyecto vacío).
-- Doc: docs/03-base-de-datos.md
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
-- 1 fila por usuario de auth.users. Se crea en /onboarding (no por trigger,
-- porque el nombre_usuario lo elige el usuario).
create table public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre_usuario  text not null unique check (nombre_usuario ~ '^[A-Za-z0-9_]{3,20}$'),
  intencion       text not null default 'busco_equipo'
                  check (intencion in ('busco_equipo', 'busco_jugadores')),
  creado_en       timestamptz not null default now()
);

-- Datos DECLARADOS por el jugador (editables por él).
create table public.perfiles_jugador (
  usuario_id       uuid primary key references public.perfiles(id) on delete cascade,
  pais             text check (pais ~ '^[A-Z]{2}$'),                 -- ISO 3166-1 alpha-2 (AR, CL...)
  idiomas          text[] not null default '{}',                     -- ISO 639-1 (es, en, pt)
  roles            text[] not null default '{}'
                   check (roles <@ array['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY']::text[]),
  zona_horaria     text not null default 'America/Argentina/Salta',  -- IANA
  horarios         jsonb not null default '[]'::jsonb,               -- [{"dia":0-6,"desde":"20:00","hasta":"23:30"}] en zona_horaria
  bio              text check (char_length(bio) <= 500),
  buscando_equipo  boolean not null default true,
  actualizado_en   timestamptz not null default now()
);

-- Contacto en una tabla aparte: RLS filtra filas, no columnas.
create table public.contactos_jugador (
  usuario_id   uuid primary key references public.perfiles(id) on delete cascade,
  tipo         text not null check (tipo in ('discord', 'email', 'whatsapp', 'otro')),
  valor        text not null check (char_length(valor) between 1 and 120),
  visibilidad  text not null default 'equipos' check (visibilidad in ('publico', 'equipos', 'oculto'))
);

-- ---------------------------------------------------------------------
-- RIOT (solo las escribe el servidor con la service role)
-- ---------------------------------------------------------------------
create table public.cuentas_riot (
  id                   uuid primary key default gen_random_uuid(),
  usuario_id           uuid not null unique references public.perfiles(id) on delete cascade, -- MVP: 1 cuenta LoL por usuario
  puuid                text not null,
  game_name            text not null,
  tag_line             text not null,
  plataforma           text not null check (plataforma in ('la1', 'la2', 'br1', 'na1')),
  verificada           boolean not null default false,
  icono_verificacion   int,
  verificacion_expira  timestamptz,
  profile_icon_id      int,
  nivel                int,
  rango_tier           text,          -- IRON..CHALLENGER (null = unranked)
  rango_division       text,          -- I..IV
  rango_lp             int,
  rango_valor          int,           -- ordenable: ver src/lib/rangos.js (para filtros "Esmeralda+")
  rango_wins           int,
  rango_losses         int,
  sincronizado_en      timestamptz,
  creado_en            timestamptz not null default now()
);
-- Un puuid puede tener varios reclamos SIN verificar, pero solo uno verificado.
create unique index cuentas_riot_puuid_verificada on public.cuentas_riot (puuid) where verificada;
create index cuentas_riot_puuid on public.cuentas_riot (puuid);
create index cuentas_riot_rango_valor on public.cuentas_riot (rango_valor);

-- Caché de partidas (inmutables → se guardan para siempre).
create table public.partidas (
  match_id      text primary key,     -- ej. LA2_1234567890
  plataforma    text not null,
  cola          int not null,         -- 420 = ranked solo/duo
  inicio        timestamptz not null,
  duracion_seg  int not null,
  version       text,
  datos         jsonb not null        -- respuesta cruda de match-v5 (por si hay que recalcular)
);

-- 1 fila por participante que nos interesa (para agregar con SQL/JS sin parsear el JSON crudo).
create table public.partidas_jugador (
  match_id             text not null references public.partidas(match_id) on delete cascade,
  puuid                text not null,
  campeon_id           int not null,
  campeon              text not null,           -- championName de Riot (id de Data Dragon)
  posicion             text,                    -- teamPosition
  victoria             boolean not null,
  kills                int not null,
  deaths               int not null,
  assists              int not null,
  cs                   int not null,            -- totalMinionsKilled + neutralMinionsKilled
  vision               int not null,            -- visionScore
  oro                  int,
  danio_campeones      int,
  participacion_kills  numeric(4,3),            -- 0..1
  primary key (match_id, puuid)
);
create index partidas_jugador_puuid on public.partidas_jugador (puuid);

-- Snapshot de las stats calculadas (lo que lee el perfil).
create table public.estadisticas_jugador (
  cuenta_id     uuid primary key references public.cuentas_riot(id) on delete cascade,
  resumen       jsonb not null,       -- forma: docs/04-riot-api.md
  partidas_n    int not null,
  calculado_en  timestamptz not null default now()
);

-- Valores de referencia por tier (en la demo son ESTIMADOS; se aclara en la UI).
create table public.benchmarks_rango (
  tier        text not null,
  posicion    text not null default 'ALL',
  kda         numeric(4,2),
  cs_min      numeric(4,2),
  vision_min  numeric(4,2),
  kp          numeric(4,3),
  fuente      text not null default 'estimado',
  primary key (tier, posicion)
);

-- Informes de IA cacheados por hash de las stats.
create table public.informes_ia (
  id          uuid primary key default gen_random_uuid(),
  cuenta_id   uuid not null references public.cuentas_riot(id) on delete cascade,
  stats_hash  text not null,
  modelo      text not null,
  contenido   jsonb not null,
  creado_en   timestamptz not null default now(),
  unique (cuenta_id, stats_hash)
);

-- ---------------------------------------------------------------------
-- EQUIPOS
-- ---------------------------------------------------------------------
create table public.equipos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique check (char_length(nombre) between 3 and 40),
  tag             text check (tag ~ '^[A-Z0-9]{2,5}$'),
  descripcion     text check (char_length(descripcion) <= 1000),
  nivel           text not null check (nivel in ('amateur', 'semi_pro')),
  rango_minimo    text,               -- tier
  roles_buscados  text[] not null default '{}'
                  check (roles_buscados <@ array['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY']::text[]),
  idiomas         text[] not null default '{}',
  pais            text check (pais ~ '^[A-Z]{2}$'),
  zona_horaria    text not null default 'America/Argentina/Salta',
  horarios        jsonb not null default '[]'::jsonb,
  reclutando      boolean not null default true,
  creado_por      uuid not null references public.perfiles(id),
  creado_en       timestamptz not null default now()
);

create table public.miembros_equipo (
  equipo_id   uuid not null references public.equipos(id) on delete cascade,
  usuario_id  uuid not null references public.perfiles(id) on delete cascade,
  rol         text not null check (rol in ('dueno', 'reclutador', 'jugador')),
  unido_en    timestamptz not null default now(),
  primary key (equipo_id, usuario_id)
);
create index miembros_equipo_usuario on public.miembros_equipo (usuario_id);

create table public.solicitudes (
  id          uuid primary key default gen_random_uuid(),
  equipo_id   uuid not null references public.equipos(id) on delete cascade,
  jugador_id  uuid not null references public.perfiles(id) on delete cascade,
  origen      text not null check (origen in ('equipo', 'jugador')),   -- quién la inició
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  mensaje     text check (char_length(mensaje) <= 500),
  creado_en   timestamptz not null default now()
);
create unique index solicitudes_pendiente_unica on public.solicitudes (equipo_id, jugador_id) where estado = 'pendiente';

-- ---------------------------------------------------------------------
-- FUNCIONES AUXILIARES (security definer → evitan recursión de RLS)
-- ---------------------------------------------------------------------
create or replace function public.es_miembro_de_algun_equipo(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros_equipo where usuario_id = uid);
$$;

create or replace function public.rol_en_equipo(eid uuid, uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select rol from miembros_equipo where equipo_id = eid and usuario_id = uid;
$$;

-- Al crear un equipo, quien lo crea queda como dueño.
create or replace function public.agregar_dueno_equipo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into miembros_equipo (equipo_id, usuario_id, rol) values (new.id, new.creado_por, 'dueno');
  return new;
end;
$$;
create trigger trg_equipo_dueno after insert on public.equipos
  for each row execute function public.agregar_dueno_equipo();

-- ---------------------------------------------------------------------
-- VISTA PARA EL BUSCADOR (sin contacto)
-- ---------------------------------------------------------------------
create view public.vista_jugadores with (security_invoker = true) as
select
  p.id as usuario_id, p.nombre_usuario,
  pj.pais, pj.idiomas, pj.roles, pj.zona_horaria, pj.horarios, pj.bio, pj.buscando_equipo,
  c.id as cuenta_id, c.game_name, c.tag_line, c.plataforma, c.verificada, c.profile_icon_id,
  c.rango_tier, c.rango_division, c.rango_lp, c.rango_valor, c.rango_wins, c.rango_losses,
  c.sincronizado_en
from public.perfiles p
join public.perfiles_jugador pj on pj.usuario_id = p.id
left join public.cuentas_riot c on c.usuario_id = p.id;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.perfiles             enable row level security;
alter table public.perfiles_jugador     enable row level security;
alter table public.contactos_jugador    enable row level security;
alter table public.cuentas_riot         enable row level security;
alter table public.partidas             enable row level security;
alter table public.partidas_jugador     enable row level security;
alter table public.estadisticas_jugador enable row level security;
alter table public.benchmarks_rango     enable row level security;
alter table public.informes_ia          enable row level security;
alter table public.equipos              enable row level security;
alter table public.miembros_equipo      enable row level security;
alter table public.solicitudes          enable row level security;

-- perfiles
create policy "perfiles: lectura pública" on public.perfiles for select using (true);
create policy "perfiles: crear el propio" on public.perfiles for insert with check (auth.uid() = id);
create policy "perfiles: editar el propio" on public.perfiles for update using (auth.uid() = id);

-- perfiles_jugador
create policy "pj: lectura pública" on public.perfiles_jugador for select using (true);
create policy "pj: crear el propio" on public.perfiles_jugador for insert with check (auth.uid() = usuario_id);
create policy "pj: editar el propio" on public.perfiles_jugador for update using (auth.uid() = usuario_id);

-- contactos_jugador
create policy "contacto: lectura según visibilidad" on public.contactos_jugador for select using (
  auth.uid() = usuario_id
  or visibilidad = 'publico'
  or (visibilidad = 'equipos' and auth.uid() is not null and public.es_miembro_de_algun_equipo(auth.uid()))
);
create policy "contacto: crear el propio"  on public.contactos_jugador for insert with check (auth.uid() = usuario_id);
create policy "contacto: editar el propio" on public.contactos_jugador for update using (auth.uid() = usuario_id);
create policy "contacto: borrar el propio" on public.contactos_jugador for delete using (auth.uid() = usuario_id);

-- Datos de Riot: lectura pública, SIN policies de escritura (solo service role).
create policy "riot: lectura pública"  on public.cuentas_riot         for select using (true);
create policy "riot: desvincular propia" on public.cuentas_riot       for delete using (auth.uid() = usuario_id);
create policy "partidas: lectura"      on public.partidas             for select using (true);
create policy "pjug: lectura"          on public.partidas_jugador     for select using (true);
create policy "stats: lectura"         on public.estadisticas_jugador for select using (true);
create policy "bench: lectura"         on public.benchmarks_rango     for select using (true);
create policy "informes: lectura"      on public.informes_ia          for select using (true);

-- equipos
create policy "equipos: lectura pública" on public.equipos for select using (true);
create policy "equipos: crear" on public.equipos for insert with check (auth.uid() = creado_por);
create policy "equipos: editar dueño/reclutador" on public.equipos for update
  using (public.rol_en_equipo(id, auth.uid()) in ('dueno', 'reclutador'));
create policy "equipos: borrar dueño" on public.equipos for delete
  using (public.rol_en_equipo(id, auth.uid()) = 'dueno');

-- miembros_equipo
create policy "miembros: lectura pública" on public.miembros_equipo for select using (true);
create policy "miembros: agrega el dueño" on public.miembros_equipo for insert
  with check (public.rol_en_equipo(equipo_id, auth.uid()) = 'dueno');
create policy "miembros: cambia rol el dueño" on public.miembros_equipo for update
  using (public.rol_en_equipo(equipo_id, auth.uid()) = 'dueno');
create policy "miembros: quita el dueño o sale uno mismo" on public.miembros_equipo for delete
  using (public.rol_en_equipo(equipo_id, auth.uid()) = 'dueno' or auth.uid() = usuario_id);

-- solicitudes
create policy "solicitudes: ver las propias o del staff" on public.solicitudes for select using (
  auth.uid() = jugador_id or public.rol_en_equipo(equipo_id, auth.uid()) in ('dueno', 'reclutador')
);
create policy "solicitudes: crear" on public.solicitudes for insert with check (
  (origen = 'jugador' and auth.uid() = jugador_id)
  or (origen = 'equipo' and public.rol_en_equipo(equipo_id, auth.uid()) in ('dueno', 'reclutador'))
);
create policy "solicitudes: responder" on public.solicitudes for update using (
  auth.uid() = jugador_id or public.rol_en_equipo(equipo_id, auth.uid()) in ('dueno', 'reclutador')
);

-- Torneos (P5): se agregan con supabase/torneos.sql en la T23.
