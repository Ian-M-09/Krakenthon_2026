export const claseCampo =
  "w-full rounded border border-border bg-bg px-3 py-2 text-text placeholder:text-muted focus:border-accent";

// Input con label y ayuda/error opcionales.
export default function Input({ label, ayuda, error, className = "", ...props }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      {label && <span className="text-sm">{label}</span>}
      <input className={claseCampo} aria-invalid={error ? true : undefined} {...props} />
      {error ? (
        <span className="block text-xs text-danger">{error}</span>
      ) : (
        ayuda && <span className="block text-xs text-muted">{ayuda}</span>
      )}
    </label>
  );
}
