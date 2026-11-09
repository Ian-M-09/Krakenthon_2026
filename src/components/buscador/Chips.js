import Link from "next/link";
import { chipsDeFiltros } from "@/lib/busqueda";

// "Entendí: Support ✕ · Esmeralda+ ✕ ..." — cada chip es un link que saca ese filtro,
// así el reclutador corrige lo que la IA interpretó mal sin volver a escribir.
export default function Chips({ filtros }) {
  const chips = chipsDeFiltros(filtros);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">{filtros.ia ? "Entendí:" : "Filtros:"}</span>
      {chips.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="inline-flex items-center gap-1 rounded-full border border-accent px-3 py-0.5 text-accent hover:bg-surface-2"
          aria-label={`Quitar filtro ${c.label}`}
        >
          {c.label} <span aria-hidden>✕</span>
        </Link>
      ))}
    </div>
  );
}
