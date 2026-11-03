import Spinner from "./Spinner";

const VARIANTES = {
  primario: "bg-accent text-accent-foreground hover:opacity-90",
  secundario: "border border-border bg-surface-2 text-text hover:border-accent",
  ghost: "text-text hover:bg-surface-2",
  peligro: "bg-danger text-accent-foreground hover:opacity-90",
};

export const claseBoton = (variante = "primario", className = "") =>
  `inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`;

// Botón base. Con `loading` se deshabilita y muestra un spinner.
export default function Button({
  variante = "primario",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}) {
  return (
    <button disabled={disabled || loading} className={claseBoton(variante, className)} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
