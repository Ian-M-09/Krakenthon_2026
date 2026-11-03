-- =====================================================================
-- Valores de referencia por tier (T11) — ESTIMADOS
-- Son aproximaciones redondeadas para la demo, NO promedios medidos:
-- por eso van con fuente = 'estimado' y la UI aclara "valores de referencia estimados".
-- Roadmap: calcularlos con datos propios (ver docs/01-alcance-demo.md → Fuera de alcance).
-- Revisar y, si hace falta, ajustar con datos públicos (lolalytics, op.gg) antes de correrlo.
-- Correr en Supabase → SQL Editor. Se puede correr varias veces (upsert).
--
-- posicion: 'ALL' = referencia general para roles con farmeo (top/mid/adc).
--           'JUNGLE' y 'UTILITY' aparte porque su CS y su visión son muy distintos.
-- =====================================================================

insert into public.benchmarks_rango (tier, posicion, kda, cs_min, vision_min, kp, fuente) values
  -- ALL
  ('IRON',        'ALL',     1.90, 4.6, 0.45, 0.420, 'estimado'),
  ('BRONZE',      'ALL',     2.10, 5.1, 0.50, 0.440, 'estimado'),
  ('SILVER',      'ALL',     2.30, 5.6, 0.55, 0.460, 'estimado'),
  ('GOLD',        'ALL',     2.50, 6.0, 0.60, 0.480, 'estimado'),
  ('PLATINUM',    'ALL',     2.60, 6.4, 0.65, 0.490, 'estimado'),
  ('EMERALD',     'ALL',     2.70, 6.8, 0.70, 0.500, 'estimado'),
  ('DIAMOND',     'ALL',     2.80, 7.2, 0.75, 0.510, 'estimado'),
  ('MASTER',      'ALL',     2.90, 7.6, 0.80, 0.520, 'estimado'),
  ('GRANDMASTER', 'ALL',     3.00, 7.8, 0.85, 0.530, 'estimado'),
  ('CHALLENGER',  'ALL',     3.10, 8.0, 0.90, 0.540, 'estimado'),
  -- JUNGLE
  ('IRON',        'JUNGLE',  2.00, 4.2, 0.55, 0.500, 'estimado'),
  ('BRONZE',      'JUNGLE',  2.20, 4.6, 0.60, 0.520, 'estimado'),
  ('SILVER',      'JUNGLE',  2.40, 5.0, 0.65, 0.540, 'estimado'),
  ('GOLD',        'JUNGLE',  2.60, 5.4, 0.70, 0.560, 'estimado'),
  ('PLATINUM',    'JUNGLE',  2.70, 5.7, 0.75, 0.570, 'estimado'),
  ('EMERALD',     'JUNGLE',  2.80, 6.0, 0.80, 0.580, 'estimado'),
  ('DIAMOND',     'JUNGLE',  2.90, 6.3, 0.85, 0.590, 'estimado'),
  ('MASTER',      'JUNGLE',  3.00, 6.6, 0.90, 0.600, 'estimado'),
  ('GRANDMASTER', 'JUNGLE',  3.10, 6.8, 0.95, 0.610, 'estimado'),
  ('CHALLENGER',  'JUNGLE',  3.20, 7.0, 1.00, 0.620, 'estimado'),
  -- UTILITY (support)
  ('IRON',        'UTILITY', 2.00, 0.9, 1.30, 0.520, 'estimado'),
  ('BRONZE',      'UTILITY', 2.20, 1.0, 1.45, 0.540, 'estimado'),
  ('SILVER',      'UTILITY', 2.40, 1.0, 1.60, 0.560, 'estimado'),
  ('GOLD',        'UTILITY', 2.60, 1.1, 1.75, 0.580, 'estimado'),
  ('PLATINUM',    'UTILITY', 2.80, 1.1, 1.90, 0.590, 'estimado'),
  ('EMERALD',     'UTILITY', 2.90, 1.2, 2.00, 0.600, 'estimado'),
  ('DIAMOND',     'UTILITY', 3.00, 1.2, 2.15, 0.610, 'estimado'),
  ('MASTER',      'UTILITY', 3.20, 1.3, 2.30, 0.620, 'estimado'),
  ('GRANDMASTER', 'UTILITY', 3.30, 1.3, 2.40, 0.630, 'estimado'),
  ('CHALLENGER',  'UTILITY', 3.40, 1.4, 2.50, 0.640, 'estimado')
on conflict (tier, posicion) do update set
  kda = excluded.kda, cs_min = excluded.cs_min, vision_min = excluded.vision_min,
  kp = excluded.kp, fuente = excluded.fuente;
