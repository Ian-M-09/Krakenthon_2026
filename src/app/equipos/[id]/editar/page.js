import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Spinner from "@/components/ui/Spinner";
import EquipoForm from "@/components/equipos/EquipoForm";
import { esUuid } from "@/lib/equipos";
import { actualizarEquipo } from "../../actions";

export const metadata = { title: "Editar equipo" };

export default function EditarEquipoPage({ params }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Editar equipo</h1>
      <Suspense fallback={<Spinner />}>
        <Editar params={params} />
      </Suspense>
    </main>
  );
}

async function Editar({ params }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/equipos/${id}/editar`);

  const [{ data: equipo }, { data: miembro }] = await Promise.all([
    supabase.from("equipos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("miembros_equipo")
      .select("rol")
      .eq("equipo_id", id)
      .eq("usuario_id", user.id)
      .maybeSingle(),
  ]);
  if (!equipo) notFound();
  // La UI lo oculta, pero la barrera real es el RLS del update.
  if (!["dueno", "reclutador"].includes(miembro?.rol)) redirect(`/equipos/${id}`);

  const inicial = {
    ...equipo,
    tag: equipo.tag ?? "",
    descripcion: equipo.descripcion ?? "",
    rango_minimo: equipo.rango_minimo ?? "",
    pais: equipo.pais ?? "",
  };

  return (
    <EquipoForm action={actualizarEquipo.bind(null, id)} inicial={inicial} textoBoton="Guardar cambios" />
  );
}
