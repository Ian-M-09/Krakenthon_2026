import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getVersion } from "@/lib/riot/ddragon";
import { minimoTier, maximoTier } from "@/lib/rangos";
import { parsearFiltros, hayFiltros, juegaEnFranja } from "@/lib/busqueda";
import BusquedaIA from "@/components/buscador/BusquedaIA";
import Chips from "@/components/buscador/Chips";
import { getEquiposStaff } from "@/lib/equipos";
import { calcularCompatibilidad } from "@/lib/compatibilidad";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Filtros from "@/components/buscador/Filtros";
import JugadorCard from "@/components/buscador/JugadorCard";

export const metadata = { title: "Buscar jugadores" };

const LIMITE = 60;

// Buscador. Los filtros viven en la URL (?rol=UTILITY&rangoMin=EMERALD) y la query la arma
// el servidor con valores ya validados por parsearFiltros (whitelist).
export default function JugadoresPage({ searchParams }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Buscar jugadores</h1>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted">
            <Spinner /> Buscando...
          </div>
        }
      >
        <Resultados searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Resultados({ searchParams }) {
  const filtros = parsearFiltros(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let q = supabase
    .from("vista_jugadores")
    .select(
      "usuario_id, nombre_usuario, pais, idiomas, roles, zona_horaria, horarios, buscando_equipo, cuenta_id, game_name, tag_line, verificada, profile_icon_id, rango_tier, rango_division, rango_lp, rango_valor"
    );
  if (filtros.roles.length) q = q.overlaps("roles", filtros.roles);
  if (filtros.rangoMin) q = q.gte("rango_valor", minimoTier(filtros.rangoMin));
  if (filtros.rangoMax) q = q.lte("rango_valor", maximoTier(filtros.rangoMax));
  if (filtros.idiomas.length) q = q.overlaps("idiomas", filtros.idiomas);
  if (filtros.paises.length) q = q.in("pais", filtros.paises);
  if (filtros.verificados) q = q.eq("verificada", true);
  if (filtros.buscando) q = q.eq("buscando_equipo", true);
  // La franja horaria se filtra en JS (horarios en JSONB con la zona de cada jugador), así que
  // traemos más filas y recortamos después.
  q = q
    .order("verificada", { ascending: false, nullsFirst: false })
    .order("rango_valor", { ascending: false, nullsFirst: false })
    .limit(filtros.franja ? LIMITE * 4 : LIMITE);

  const [{ data: filas, error }, equipos, version] = await Promise.all([
    q,
    getEquiposStaff(supabase, user?.id),
    getVersion(),
  ]);

  const filtrosUI = <Filtros filtros={filtros} equipos={equipos} />;
  const ahora = new Date();
  const jugadores = (filas ?? [])
    .filter((j) => !filtros.franja || juegaEnFranja(j, filtros.franja, filtros.tz, ahora))
    .slice(0, LIMITE);
  if (error) {
    console.error("buscador", error);
    return (
      <Layout filtros={filtrosUI}>
        <ErrorState texto="No pudimos hacer la búsqueda. Probá de nuevo en unos segundos." />
      </Layout>
    );
  }

  // Compatibilidad (T18): solo si quien mira es dueño o reclutador de algún equipo.
  const equipo = equipos.find((e) => e.id === filtros.equipo) ?? equipos[0] ?? null;
  let lista = jugadores;
  if (equipo) {
    const ids = jugadores.map((j) => j.cuenta_id).filter(Boolean);
    const { data: roles } = ids.length
      ? await supabase
          .from("estadisticas_jugador")
          .select("cuenta_id, rol_principal:resumen->>rol_principal")
          .in("cuenta_id", ids)
      : { data: [] };
    const rolPrincipal = Object.fromEntries((roles ?? []).map((r) => [r.cuenta_id, r.rol_principal]));
    lista = jugadores
      .map((j) => ({
        ...j,
        compat: calcularCompatibilidad({ ...j, rol_principal: rolPrincipal[j.cuenta_id] }, equipo, ahora),
      }))
      .sort((a, b) => b.compat.total - a.compat.total);
  }

  return (
    <Layout filtros={filtrosUI}>
      <BusquedaIA key={filtros.q} textoInicial={filtros.q} equipo={equipo?.id ?? null} />
      <Chips filtros={filtros} />
      {filtros.franja && (
        <p className="text-xs text-muted">
          Horario convertido desde tu zona ({filtros.tz}) a la de cada jugador.
        </p>
      )}
      <p className="text-sm text-muted">
        {lista.length === LIMITE ? `Mostrando los primeros ${LIMITE}` : `${lista.length} jugadores`}
        {equipo && ` · ordenados por compatibilidad con ${equipo.nombre}`}
      </p>
      {lista.length === 0 ? (
        <EmptyState
          titulo="No encontramos jugadores con esos filtros"
          texto={hayFiltros(filtros) ? "Probá aflojando algún filtro." : "Todavía no hay jugadores registrados."}
          accion={hayFiltros(filtros) ? { href: "/jugadores", label: "Limpiar filtros" } : null}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((j) => (
            <JugadorCard
              key={j.usuario_id}
              jugador={j}
              version={version}
              compat={j.compat}
              equipoNombre={equipo?.nombre}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

// En celular los filtros van plegados ("Filtros ▾") arriba de la búsqueda con IA, para no tapar
// la pantalla; en escritorio quedan siempre abiertos al costado. Son dos copias del mismo form
// porque un <details> cerrado no se puede forzar abierto solo con CSS.
function Layout({ filtros, children }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside>
        <details className="group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            Filtros
            <span aria-hidden className="text-muted transition group-open:rotate-180">▾</span>
          </summary>
          <div className="pt-2">{filtros}</div>
        </details>
        <div className="hidden lg:block">{filtros}</div>
      </aside>
      <section className="space-y-3">{children}</section>
    </div>
  );
}
