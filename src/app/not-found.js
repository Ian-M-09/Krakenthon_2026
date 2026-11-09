import Link from "next/link";
import { claseBoton } from "@/components/ui/Button";

export const metadata = { title: "No encontrado" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-bold text-accent">404</p>
      <h1 className="text-xl font-semibold">No encontramos esta página</h1>
      <p className="text-sm text-muted">
        Puede que el jugador o el equipo no exista o que el link esté mal escrito.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/jugadores" className={claseBoton("primario")}>
          Buscar jugadores
        </Link>
        <Link href="/" className={claseBoton("secundario")}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
