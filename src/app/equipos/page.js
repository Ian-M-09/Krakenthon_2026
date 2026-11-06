import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { claseBoton } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import EquipoCard from "@/components/equipos/EquipoCard";

export const metadata = { title: "Equipos" };

export default function EquiposPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Equipos</h1>
        <Link href="/equipos/nuevo" className={claseBoton("primario")}>
          Crear equipo
        </Link>
      </div>
      <Suspense fallback={<Spinner />}>
        <Listado />
      </Suspense>
    </main>
  );
}

async function Listado() {
  const supabase = await createClient();
  const { data: equipos, error } = await supabase
    .from("equipos")
    .select("id, nombre, tag, nivel, rango_minimo, roles_buscados, idiomas, pais, reclutando")
    .order("reclutando", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(60);

  if (error) return <ErrorState texto="No pudimos cargar los equipos. Probá de nuevo en unos segundos." />;
  if (!equipos.length) {
    return (
      <EmptyState
        titulo="Todavía no hay equipos"
        texto="Creá el primero y empezá a buscar jugadores verificados."
        accion={{ href: "/equipos/nuevo", label: "Crear equipo" }}
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {equipos.map((e) => (
        <EquipoCard key={e.id} equipo={e} />
      ))}
    </div>
  );
}
