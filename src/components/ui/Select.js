import { claseCampo } from "./Input";

// Select con label. `opciones` = [{ valor, label }].
export default function Select({ label, opciones = [], ayuda, className = "", ...props }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      {label && <span className="text-sm">{label}</span>}
      <select className={claseCampo} {...props}>
        {opciones.map((op) => (
          <option key={op.valor} value={op.valor}>
            {op.label}
          </option>
        ))}
      </select>
      {ayuda && <span className="block text-xs text-muted">{ayuda}</span>}
    </label>
  );
}
