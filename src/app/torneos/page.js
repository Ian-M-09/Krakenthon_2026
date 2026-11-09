import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export const metadata = { title: "Torneos" };

// T23 (prioridad 5): pantalla de roadmap en lugar del flujo completo. Muestra cómo va a funcionar
// el modelo de negocio sin simular pagos a medias.
const PASOS = [
  ["Crear torneo", "El organizador define formato, cupo, fecha y premio."],
  ["Depositar el premio", "El premio queda en garantía (custodia) antes de publicar: los equipos saben que existe."],
  ["Publicar e inscribir", "Los equipos se anotan; se puede exigir rango mínimo con stats verificadas."],
  ["Jugar y declarar ganador", "El organizador carga el resultado."],
  ["Liberar el pago", "Se paga al ganador el premio menos la comisión de la plataforma."],
];

export default function TorneosPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Torneos</h1>
        <Badge tono="warning">Próximamente</Badge>
      </div>
      <p className="text-muted">
        Torneos amateur con el premio en garantía y equipos con identidad verificada. Está en el
        roadmap; así va a funcionar:
      </p>
      <ol className="space-y-3">
        {PASOS.map(([titulo, texto], i) => (
          <li key={titulo}>
            <Card className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{titulo}</p>
                <p className="text-sm text-muted">{texto}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">
        Ejemplo: premio de $100.000 con 10% de comisión → el ganador recibe $90.000 y la plataforma
        $10.000. Los pagos reales (y Mercado Pago) están fuera del alcance de la demo.
      </p>
    </main>
  );
}
