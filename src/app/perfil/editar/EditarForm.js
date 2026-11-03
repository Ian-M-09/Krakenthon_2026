"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { claseCampo } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ROLES, IDIOMAS, PAISES, TIPOS_CONTACTO, VISIBILIDADES, aOpciones } from "@/lib/catalogos";
import { DIAS, ZONAS_HORARIAS } from "@/lib/horarios";
import { guardarDisponibilidad } from "./actions";

// Grupo de checkboxes con el mismo `name` (llegan con formData.getAll).
function Checkboxes({ legend, name, catalogo, seleccionados }) {
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

function EditorHorarios({ horarios }) {
  const porDia = Object.fromEntries(horarios.map((h) => [h.dia, h]));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm">Horarios en los que podés jugar</legend>
      <p className="text-xs text-muted">
        Si terminás después de medianoche, poné la hora de fin igual (ej. 22:00 → 01:00).
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

export default function EditarForm({ inicial }) {
  const [state, formAction, pending] = useActionState(guardarDisponibilidad, null);
  // Si el servidor devolvió un error, re-montamos el form con lo que el usuario había cargado.
  const v = state?.valores ?? inicial;

  return (
    <form key={state?.n ?? 0} action={formAction} className="space-y-4 pt-4">
      <Card className="space-y-4">
        <h2 className="font-semibold">Cómo jugás</h2>
        <Checkboxes legend="Roles" name="roles" catalogo={ROLES} seleccionados={v.roles} />
        <Checkboxes legend="Idiomas" name="idiomas" catalogo={IDIOMAS} seleccionados={v.idiomas} />
        <Select
          label="País"
          name="pais"
          defaultValue={v.pais}
          opciones={[{ valor: "", label: "Sin especificar" }, ...aOpciones(PAISES)]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="buscando_equipo" defaultChecked={v.buscando_equipo} />
          Estoy buscando equipo
        </label>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Disponibilidad</h2>
        <Select
          label="Tu zona horaria"
          name="zona_horaria"
          defaultValue={v.zona_horaria}
          opciones={ZONAS_HORARIAS}
          ayuda="Los que vean tu perfil van a ver tus horarios convertidos a su zona."
        />
        <EditorHorarios horarios={v.horarios} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Sobre vos y contacto</h2>
        <label className="block space-y-1">
          <span className="text-sm">Bio</span>
          <textarea
            name="bio"
            rows={4}
            maxLength={500}
            defaultValue={v.bio}
            className={claseCampo}
            placeholder="Contá cómo jugás, qué buscás en un equipo, experiencia en torneos..."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Tipo de contacto"
            name="contacto_tipo"
            defaultValue={v.contacto_tipo}
            opciones={aOpciones(TIPOS_CONTACTO)}
          />
          <Input
            label="Contacto"
            name="contacto_valor"
            maxLength={120}
            defaultValue={v.contacto_valor}
            placeholder="usuario de Discord, email..."
            ayuda="Dejalo vacío para borrarlo."
          />
        </div>
        <Select
          label="¿Quién puede ver tu contacto?"
          name="contacto_visibilidad"
          defaultValue={v.contacto_visibilidad}
          opciones={aOpciones(VISIBILIDADES)}
        />
      </Card>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
