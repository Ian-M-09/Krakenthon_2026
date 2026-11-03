import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVersion } from "@/lib/riot/ddragon";
import { elegirBenchmark } from "@/lib/stats";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import PerfilHeader from "@/components/perfil/PerfilHeader";
import {
  ResumenStats,
  FormaReciente,
  DistribucionRoles,
  TablaCampeones,
  ComparacionRango,
} from "@/components/perfil/StatsVerificadas";
import { DatosDeclarados, Contacto } from "@/components/perfil/DatosDeclarados";

export const metadata = { title: "Perfil de jugador" };

// Perfil público. `params` es una promesa (Next 16) y depende del request, así que todo va
// dentro de <Suspense> por cacheComponents.
export default function PerfilJugadorPage({ params }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted">
            <Spinner /> Cargando perfil...
          </div>
        }
      >
        <Perfil params={params} />
      </Suspense>
    </main>
  );
}

async function Perfil({ params }) {
  const { usuario } = await params;
  const supabase = await createClient();

  const [{ data: perfil }, { data: authData }, version] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_usuario")
      .eq("nombre_usuario", decodeURIComponent(usuario))
      .maybeSingle(),
    supabase.auth.getUser(),
    getVersion(),
  ]);
  if (!perfil) notFound();

  const esPropio = authData?.user?.id === perfil.id;

  // Todo se lee con la sesión del visitante: el RLS decide qué contacto puede ver.
  const [{ data: cuenta }, { data: datos }, { data: contacto }] = await Promise.all([
    supabase
      .from("cuentas_riot")
      .select(
        "id, game_name, tag_line, plataforma, verificada, profile_icon_id, rango_tier, rango_division, rango_lp, rango_wins, rango_losses, sincronizado_en"
      )
      .eq("usuario_id", perfil.id)
      .maybeSingle(),
    supabase
      .from("perfiles_jugador")
      .select("pais, idiomas, roles, zona_horaria, horarios, bio, buscando_equipo")
      .eq("usuario_id", perfil.id)
      .maybeSingle(),
    supabase
      .from("contactos_jugador")
      .select("tipo, valor, visibilidad")
      .eq("usuario_id", perfil.id)
      .maybeSingle(),
  ]);

  const [{ data: stats }, { data: benchmarks }] = await Promise.all([
    cuenta
      ? supabase.from("estadisticas_jugador").select("resumen").eq("cuenta_id", cuenta.id).maybeSingle()
      : { data: null },
    cuenta?.rango_tier
      ? supabase.from("benchmarks_rango").select("*").eq("tier", cuenta.rango_tier)
      : { data: [] },
  ]);
  const resumen = stats?.resumen;

  return (
    <>
      <PerfilHeader
        perfil={perfil}
        cuenta={cuenta}
        version={version}
        esPropio={esPropio}
        ahora={new Date()}
      />

      {!cuenta ? (
        esPropio && (
          <EmptyState
            titulo="Todavía no vinculaste tu cuenta de LoL"
            texto="Vinculala para que tus stats verificadas aparezcan en tu perfil."
            accion={{ href: "/perfil/vincular", label: "Vincular cuenta" }}
          />
        )
      ) : !resumen || resumen.partidas === 0 ? (
        <EmptyState
          titulo="Sin partidas ranked para mostrar"
          texto={
            esPropio
              ? "Tocá \"Actualizar datos\" para traer tus últimas ranked Solo/Duo."
              : "Este jugador todavía no tiene ranked Solo/Duo recientes sincronizadas."
          }
        />
      ) : (
        <>
          <ResumenStats resumen={resumen} />
          <div className="grid gap-4 md:grid-cols-2">
            <TablaCampeones campeones={resumen.por_campeon} version={version} />
            <ComparacionRango
              resumen={resumen}
              benchmark={elegirBenchmark(benchmarks ?? [], cuenta.rango_tier, resumen.rol_principal)}
            />
            <DistribucionRoles porRol={resumen.por_rol} total={resumen.partidas} />
            <FormaReciente forma={resumen.forma_reciente} />
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <DatosDeclarados datos={datos} />
        </div>
        <Contacto contacto={contacto} esPropio={esPropio} />
      </div>
    </>
  );
}
