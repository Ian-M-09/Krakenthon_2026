// Indicador de carga. `label` lo lee el lector de pantalla.
export default function Spinner({ className = "", label = "Cargando" }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
