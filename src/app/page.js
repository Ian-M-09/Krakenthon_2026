import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { claseBoton } from "@/components/ui/Button";

// Landing provisoria (el diseño final llega en la T21).
// Con cacheComponents, lo que lee cookies va dentro de <Suspense>: el resto se prerenderiza.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">Tu identidad competitiva, verificada</h1>
      <p className="text-muted">
        Stats reales de League of Legends sacadas de la API de Riot, que nadie puede editar. Para que
        los equipos amateur y semi-pro de LATAM encuentren jugadores en los que pueden confiar.
      </p>
      <Suspense fallback={<div className="h-10" />}>
        <Acciones />
      </Suspense>
    </main>
  );
}

async function Acciones() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/registro" className={claseBoton("primario")}>
          Crear perfil
        </Link>
        <Link href="/jugadores" className={claseBoton("secundario")}>
          Buscar jugadores
        </Link>
      </div>
    );
  }

  const [{ data: perfil }, { data: cuenta }] = await Promise.all([
    supabase.from("perfiles").select("nombre_usuario").eq("id", user.id).maybeSingle(),
    supabase.from("cuentas_riot").select("verificada").eq("usuario_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-3">
      <p>
        Hola <strong>{perfil?.nombre_usuario ?? user.email}</strong>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {!cuenta?.verificada && (
          <Link href="/perfil/vincular" className={claseBoton("primario")}>
            {cuenta ? "Verificar mi cuenta de LoL" : "Vincular mi cuenta de LoL"}
          </Link>
        )}
        <Link href="/jugadores" className={claseBoton("secundario")}>
          Buscar jugadores
        </Link>
      </div>
    </div>
  );
}
