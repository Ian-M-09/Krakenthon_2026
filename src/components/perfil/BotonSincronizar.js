"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

// "Actualizar datos": llama al sync (con cooldown de 10 min en el servidor) y refresca la página.
export default function BotonSincronizar() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(false);

  async function sincronizar() {
    setCargando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/riot/sincronizar", { method: "POST" }).then((r) => r.json());
      if (!res.ok) {
        setError(true);
        setMensaje(res.error.message);
      } else {
        const { estado, nuevas, mensaje } = res.data;
        setError(false);
        setMensaje(estado === "actualizado" ? `Listo: ${nuevas} partidas nuevas.` : mensaje);
        router.refresh();
      }
    } catch {
      setError(true);
      setMensaje("No pudimos conectarnos. Revisá tu conexión.");
    }
    setCargando(false);
  }

  return (
    <div className="space-y-1">
      <Button variante="secundario" onClick={sincronizar} loading={cargando} className="text-sm">
        Actualizar datos
      </Button>
      {mensaje && (
        <p role={error ? "alert" : "status"} className={`text-xs ${error ? "text-danger" : "text-muted"}`}>
          {mensaje}
        </p>
      )}
    </div>
  );
}
