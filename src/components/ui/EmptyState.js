import Link from "next/link";
import { claseBoton } from "./Button";

// Estado vacío con una acción: "Todavía no vinculaste tu cuenta → Vincular".
export default function EmptyState({ titulo, texto, accion }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
      <p className="font-semibold">{titulo}</p>
      {texto && <p className="text-sm text-muted">{texto}</p>}
      {accion && (
        <Link href={accion.href} className={claseBoton("primario")}>
          {accion.label}
        </Link>
      )}
    </div>
  );
}
