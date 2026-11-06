"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

// `action` = agregarMiembro con el equipoId ya bindeado.
export default function AgregarMiembro({ action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="Agregar miembro"
          name="nombre_usuario"
          required
          placeholder="nombre de usuario"
          className="min-w-48 flex-1"
        />
        <Select
          label="Rol"
          name="rol"
          defaultValue="jugador"
          opciones={[
            { valor: "jugador", label: "Jugador" },
            { valor: "reclutador", label: "Reclutador" },
          ]}
        />
        <Button type="submit" loading={pending}>
          Agregar
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
    </form>
  );
}
