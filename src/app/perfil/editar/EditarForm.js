"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { claseCampo } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ROLES, IDIOMAS, PAISES, TIPOS_CONTACTO, VISIBILIDADES, aOpciones } from "@/lib/catalogos";
import { ZONAS_HORARIAS } from "@/lib/horarios";
import Checkboxes from "@/components/forms/Checkboxes";
import EditorHorarios from "@/components/forms/EditorHorarios";
import { guardarDisponibilidad } from "./actions";

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
