// % de compatibilidad con el desglose por criterio (transparente: la fórmula está a la vista).
// <details> nativo: se despliega sin JavaScript.
const tono = (total) => (total >= 70 ? "text-success" : total >= 40 ? "text-warning" : "text-danger");

export default function Compatibilidad({ resultado, equipoNombre, abierto = false }) {
  const { total, desglose } = resultado;
  return (
    <details open={abierto} className="rounded border border-border bg-surface-2 p-2 text-sm">
      <summary className="cursor-pointer">
        <span className={`font-bold ${tono(total)}`}>{total}%</span>{" "}
        <span className="text-muted">compatible con {equipoNombre}</span>
      </summary>
      <ul className="mt-2 space-y-2">
        {desglose.map((d) => (
          <li key={d.clave} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{d.label}</span>
              <span className="text-muted">
                {d.puntos}/{d.max}
              </span>
            </div>
            <div className="h-1.5 rounded bg-bg">
              <div className="h-1.5 rounded bg-accent" style={{ width: `${(d.puntos / d.max) * 100}%` }} />
            </div>
            <p className="text-xs text-muted">{d.detalle}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
