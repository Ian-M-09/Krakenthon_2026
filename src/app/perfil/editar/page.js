import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Spinner from "@/components/ui/Spinner";
import EditarForm from "./EditarForm";

export const metadata = { title: "Editar disponibilidad" };

export default function EditarPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-2 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Disponibilidad y datos declarados</h1>
      <p className="text-sm text-muted">
        Tus stats y tu rango salen de la API de Riot y no se pueden editar. Acá cargás lo que los
        equipos necesitan saber para contactarte.
      </p>
      <Suspense fallback={<Spinner />}>
        <CargarDatos />
      </Suspense>
    </main>
  );
}

async function CargarDatos() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: datos }, { data: contacto }] = await Promise.all([
    supabase
      .from("perfiles_jugador")
      .select("pais, idiomas, roles, zona_horaria, horarios, bio, buscando_equipo")
      .eq("usuario_id", user.id)
      .maybeSingle(),
    supabase
      .from("contactos_jugador")
      .select("tipo, valor, visibilidad")
      .eq("usuario_id", user.id)
      .maybeSingle(),
  ]);

  // Mismo formato que devuelve leerFormulario() en actions.js.
  const inicial = {
    pais: datos?.pais ?? "",
    idiomas: datos?.idiomas ?? [],
    roles: datos?.roles ?? [],
    zona_horaria: datos?.zona_horaria ?? "America/Argentina/Salta",
    horarios: datos?.horarios ?? [],
    bio: datos?.bio ?? "",
    buscando_equipo: datos?.buscando_equipo ?? true,
    contacto_tipo: contacto?.tipo ?? "discord",
    contacto_valor: contacto?.valor ?? "",
    contacto_visibilidad: contacto?.visibilidad ?? "equipos",
  };

  return <EditarForm inicial={inicial} />;
}
