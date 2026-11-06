import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getVersion } from "@/lib/riot/ddragon";
import { minimoTier, maximoTier } from "@/lib/rangos";
import { parsearFiltros, hayFiltros } from "@/lib/busqueda";
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
  q = q
    .order("verificada", { ascending: false, nullsFirst: false })
    .order("rango_valor", { ascending: false, nullsFirst: false })
    .limit(LIMITE);

  const [{ data: jugadores, error }, equipos, version] = await Promise.all([
    q,
    getEquiposStaff(supabase, user?.id),
    getVersion(),
  ]);

  const filtrosUI = <Filtros filtros={filtros} equipos={equipos} />;
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
    const ahora = new Date();
    lista = jugadores
      .map((j) => ({
        ...j,
        compat: calcularCompatibilidad({ ...j, rol_principal: rolPrincipal[j.cuenta_id] }, equipo, ahora),
      }))
      .sort((a, b) => b.compat.total - a.compat.total);
  }

  return (
    <Layout filtros={filtrosUI}>
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

function Layout({ filtros, children }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside>{filtros}</aside>
      <section className="space-y-3">{children}</section>
    </div>
  );
}
