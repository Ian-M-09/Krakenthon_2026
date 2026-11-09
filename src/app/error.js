"use client";

import Link from "next/link";
import Button, { claseBoton } from "@/components/ui/Button";

// Red de seguridad: si una página tira un error inesperado, se ve esto en lugar de una pantalla
// rota. La navbar y el footer siguen andando (están en el layout).
export default function Error({ reset }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="text-sm text-muted">
        Tuvimos un problema cargando esta página. Probá de nuevo en unos segundos.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>Reintentar</Button>
        <Link href="/" className={claseBoton("secundario")}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
