import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./(auth)/actions";

// Home provisoria para probar el flujo de auth. Se reemplaza en la T06.
// Con cacheComponents, lo que lee cookies va dentro de <Suspense>: el resto se prerenderiza.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Krakethon 2026</h1>
      <Suspense fallback={<p className="text-muted">Cargando...</p>}>
        <EstadoSesion />
      </Suspense>
    </main>
  );
}

async function EstadoSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-accent px-4 py-2 font-semibold text-accent-foreground">
          Iniciar sesión
        </Link>
        <Link href="/registro" className="rounded border border-border px-4 py-2">
          Registrarme
        </Link>
      </div>
    );
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre_usuario, intencion")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <p>
        Hola <strong>{perfil?.nombre_usuario ?? user.email}</strong>
        {perfil && ` · ${perfil.intencion === "busco_equipo" ? "Buscás equipo" : "Buscás jugadores"}`}
      </p>
      <form action={logout}>
        <button className="rounded bg-accent px-4 py-2 font-semibold text-accent-foreground">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
