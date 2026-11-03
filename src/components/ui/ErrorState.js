// Mensaje de error amigable. Si se pasa `onReintentar` (componente de cliente) muestra el botón.
export default function ErrorState({ titulo = "Algo salió mal", texto, onReintentar }) {
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-danger p-4">
      <p className="font-semibold text-danger">{titulo}</p>
      {texto && <p className="text-sm text-muted">{texto}</p>}
      {onReintentar && (
        <button onClick={onReintentar} className="text-sm font-semibold text-accent underline">
          Reintentar
        </button>
      )}
    </div>
  );
}
