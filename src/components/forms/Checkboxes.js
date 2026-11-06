// Grupo de checkboxes con el mismo `name` (llegan con formData.getAll) con estilo de chips.
export default function Checkboxes({ legend, name, catalogo, seleccionados = [] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(catalogo).map(([valor, label]) => (
          <label
            key={valor}
            className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:text-accent"
          >
            <input
              type="checkbox"
              name={name}
              value={valor}
              defaultChecked={seleccionados.includes(valor)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
