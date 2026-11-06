"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { claseCampo } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkboxes from "@/components/forms/Checkboxes";
import EditorHorarios from "@/components/forms/EditorHorarios";
import { ROLES, IDIOMAS, PAISES, aOpciones } from "@/lib/catalogos";
import { ZONAS_HORARIAS } from "@/lib/horarios";
import { LABEL_TIER } from "@/lib/rangos";
import { NIVELES } from "@/lib/equipos";

export const EQUIPO_VACIO = {
  nombre: "",
  tag: "",
  descripcion: "",
  nivel: "amateur",
  rango_minimo: "",
  roles_buscados: [],
  idiomas: ["es"],
  pais: "",
  zona_horaria: "America/Argentina/Salta",
  horarios: [],
  reclutando: true,
};

// Formulario de crear/editar equipo. `action` es una server action (con el id ya bindeado si edita).
export default function EquipoForm({ action, inicial = EQUIPO_VACIO, textoBoton = "Crear equipo" }) {
  const [state, formAction, pending] = useActionState(action, null);
  const v = state?.valores ?? inicial;

  return (
    <form key={state?.n ?? 0} action={formAction} className="space-y-4">
      <Card className="space-y-4">
        <h2 className="font-semibold">Datos del equipo</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Nombre"
            name="nombre"
            required
            minLength={3}
            maxLength={40}
            defaultValue={v.nombre}
            className="sm:col-span-2"
          />
          <Input
            label="Tag (opcional)"
            name="tag"
            maxLength={5}
            defaultValue={v.tag}
            placeholder="KRK"
            ayuda="2 a 5 letras o números"
          />
        </div>
        <label className="block space-y-1">
          <span className="text-sm">Descripción</span>
          <textarea
            name="descripcion"
            rows={3}
            maxLength={1000}
            defaultValue={v.descripcion}
            className={claseCampo}
            placeholder="Objetivos, torneos en los que juegan, qué tipo de jugadores buscan..."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Nivel" name="nivel" defaultValue={v.nivel} opciones={aOpciones(NIVELES)} />
          <Select
            label="País"
            name="pais"
            defaultValue={v.pais}
            opciones={[{ valor: "", label: "Sin especificar" }, ...aOpciones(PAISES)]}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Qué buscan</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="reclutando" defaultChecked={v.reclutando} />
          Estamos reclutando
        </label>
        <Checkboxes
          legend="Roles que buscan"
          name="roles_buscados"
          catalogo={ROLES}
          seleccionados={v.roles_buscados}
        />
        <Select
          label="Rango mínimo"
          name="rango_minimo"
          defaultValue={v.rango_minimo}
          opciones={[{ valor: "", label: "Sin mínimo" }, ...aOpciones(LABEL_TIER)]}
        />
        <Checkboxes legend="Idiomas del equipo" name="idiomas" catalogo={IDIOMAS} seleccionados={v.idiomas} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Horarios de práctica</h2>
        <Select
          label="Zona horaria del equipo"
          name="zona_horaria"
          defaultValue={v.zona_horaria}
          opciones={ZONAS_HORARIAS}
        />
        <EditorHorarios horarios={v.horarios} legend="Días y horarios en los que entrenan" />
      </Card>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Guardando..." : textoBoton}
      </Button>
    </form>
  );
}
