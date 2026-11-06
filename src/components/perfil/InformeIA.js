"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ROLES } from "@/lib/catalogos";

function Lista({ titulo, items, tono }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className={`text-sm font-semibold ${tono}`}>{titulo}</h4>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{it.titulo}</span>{" "}
            <Badge className="ml-1">{it.metrica}</Badge>
            <p className="text-muted">{it.detalle}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Informe de scouting IA. Solo el dueño del perfil lo puede generar o regenerar;
// el resto ve el último guardado. Si Gemini falla, se muestra el error y el perfil sigue andando.
export default function InformeIA({ informeInicial, esPropio, desactualizado, hayStats }) {
  const [informe, setInforme] = useState(informeInicial);
  const [viejo, setViejo] = useState(desactualizado);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function generar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/ia/informe", { method: "POST" }).then((r) => r.json());
      if (res.ok) {
        setInforme(res.data);
        setViejo(false);
      } else {
        setError(res.error.message);
      }
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión.");
    }
    setCargando(false);
  }

  const c = informe?.contenido;

  return (
    <Card as="section" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Informe de scouting IA</h2>
          {c && <Badge tono="accent">{c.perfil_jugador}</Badge>}
        </div>
        {esPropio && hayStats && (!c || viejo) && (
          <Button onClick={generar} loading={cargando} className="text-sm">
            {cargando ? "Analizando partidas..." : c ? "Regenerar con mis stats nuevas" : "Generar informe"}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {!c ? (
        <p className="text-sm text-muted">
          {!hayStats
            ? "Hace falta tener partidas sincronizadas para generar el informe."
            : esPropio
              ? "Generá un análisis de tus partidas para que los equipos vean tus fortalezas de un vistazo."
              : "Este jugador todavía no generó su informe."}
        </p>
      ) : (
        <>
          {viejo && (
            <p className="text-xs text-warning">
              Las stats cambiaron desde que se generó este informe.
            </p>
          )}
          <p>{c.resumen}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Lista titulo="Fortalezas" items={c.fortalezas} tono="text-success" />
            <Lista titulo="A mejorar" items={c.debilidades} tono="text-danger" />
          </div>
          {c.campeones_destacados?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Campeones destacados</h4>
              <ul className="space-y-1 text-sm">
                {c.campeones_destacados.map((cd) => (
                  <li key={cd.campeon}>
                    <span className="font-medium">{cd.campeon}:</span>{" "}
                    <span className="text-muted">{cd.motivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <h4 className="font-semibold">Comparación con su rango</h4>
              <p className="text-muted">{c.comparacion_rango}</p>
            </div>
            <div>
              <h4 className="font-semibold">Rol recomendado</h4>
              <p className="text-muted">{ROLES[c.rol_recomendado]}</p>
            </div>
          </div>
          <p className="text-xs text-muted">
            Generado por IA a partir de stats verificadas ·{" "}
            {informe.creado_en.slice(0, 10).split("-").reverse().join("/")}. Los números del perfil
            salen de la BD, no de este texto.
          </p>
        </>
      )}
    </Card>
  );
}
