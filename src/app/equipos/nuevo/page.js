import EquipoForm from "@/components/equipos/EquipoForm";
import { crearEquipo } from "../actions";

export const metadata = { title: "Crear equipo" };

// Ruta protegida por el proxy (/equipos/nuevo requiere sesión).
export default function NuevoEquipoPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Crear equipo</h1>
      <p className="text-sm text-muted">
        Vas a quedar como dueño. Después podés sumar reclutadores y jugadores.
      </p>
      <EquipoForm action={crearEquipo} />
    </main>
  );
}
