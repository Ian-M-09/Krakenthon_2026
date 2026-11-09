"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { claseCampo } from "@/components/ui/Input";

const EJEMPLO = "busco support Esmeralda+, que hable español y juegue de noche";

// Búsqueda en lenguaje natural (T19): la IA devuelve filtros JSON validados y redirigimos al
// buscador con esos filtros en la URL. La query la arma el servidor, nunca el LLM.
export default function BusquedaIA({ textoInicial = "", equipo = null }) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function buscar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/ia/busqueda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          equipo,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }).then((r) => r.json());
      if (!res.ok) {
        setError(res.error.message);
      } else {
        router.push(`/jugadores?${res.data.query}`);
      }
    } catch {
      setError("No pudimos conectarnos. Usá los filtros de abajo mientras tanto.");
    }
    setCargando(false);
  }

  return (
    <form onSubmit={buscar} className="space-y-2">
      <label htmlFor="busqueda-ia" className="text-sm font-semibold">
        Buscá con tus palabras <span className="font-normal text-muted">· con IA</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="busqueda-ia"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={300}
          placeholder={EJEMPLO}
          className={`${claseCampo} flex-1`}
        />
        <Button type="submit" loading={cargando}>
          {cargando ? "Interpretando..." : "Buscar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
