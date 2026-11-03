import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { claseBoton } from "@/components/ui/Button";

const LINKS = [
  { href: "/jugadores", label: "Jugadores" },
  { href: "/equipos", label: "Equipos" },
  { href: "/torneos", label: "Torneos" },
];

// La barra es estática; solo la parte de la sesión lee cookies, por eso va en <Suspense>
// (con cacheComponents el resto se prerenderiza).
export default function Navbar() {
  return (
    <header className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-bold text-accent">
          Krakethon
        </Link>
        <ul className="flex flex-wrap gap-4 text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-muted hover:text-text">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Suspense fallback={<span className="text-muted">…</span>}>
            <MenuSesion />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

async function MenuSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className="text-muted hover:text-text">
          Iniciar sesión
        </Link>
        <Link href="/registro" className={claseBoton("primario", "px-3 py-1.5 text-sm")}>
          Crear perfil
        </Link>
      </>
    );
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre_usuario")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      {perfil && (
        <Link href={`/jugadores/${perfil.nombre_usuario}`} className="text-muted hover:text-text">
          Mi perfil
        </Link>
      )}
      <form action={logout}>
        <button className="text-muted hover:text-text">Salir</button>
      </form>
    </>
  );
}
