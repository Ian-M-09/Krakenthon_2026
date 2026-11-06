import { claseCampo } from "@/components/ui/Input";
import { DIAS } from "@/lib/horarios";

// Un bloque por día: checkbox + desde/hasta. Se lee en el servidor con horariosDesdeFormData().
export default function EditorHorarios({ horarios = [], legend = "Horarios en los que podés jugar" }) {
  const porDia = Object.fromEntries(horarios.map((h) => [h.dia, h]));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm">{legend}</legend>
      <p className="text-xs text-muted">
        Si termina después de medianoche, poné la hora de fin igual (ej. 22:00 → 01:00).
      </p>
      <ul className="space-y-2">
        {DIAS.map((nombre, dia) => {
          const h = porDia[dia];
          return (
            <li key={dia} className="flex flex-wrap items-center gap-2">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input type="checkbox" name={`dia_${dia}_activo`} defaultChecked={!!h} />
                {nombre}
              </label>
              <input
                type="time"
                name={`dia_${dia}_desde`}
                defaultValue={h?.desde ?? "20:00"}
                aria-label={`${nombre} desde`}
                className={`${claseCampo} w-32`}
              />
              <span className="text-muted">a</span>
              <input
                type="time"
                name={`dia_${dia}_hasta`}
                defaultValue={h?.hasta ?? "23:00"}
                aria-label={`${nombre} hasta`}
                className={`${claseCampo} w-32`}
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
