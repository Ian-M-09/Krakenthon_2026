const TONOS = {
  neutro: "border-border text-muted",
  accent: "border-accent text-accent",
  success: "border-success text-success",
  danger: "border-danger text-danger",
  warning: "border-warning text-warning",
};

// Etiqueta chica: verificado, rol, rango...
export default function Badge({ tono = "neutro", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  );
}
