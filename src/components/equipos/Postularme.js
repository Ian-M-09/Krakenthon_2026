"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { claseCampo } from "@/components/ui/Input";

// "Postularme": el jugador se ofrece al equipo con un mensaje opcional para el capitán.
// `action` = postularme con el equipoId ya bindeado.
export default function Postularme({ action, equipoNombre, rechazadaAntes }) {
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.ok) {
    return (
      <Card className="space-y-1">
        <h2 className="text-lg font-semibold">Postulación enviada</h2>
        <p className="text-sm text-success">{state.ok}</p>
      </Card>
    );
  }

  return (
    <Card as="form" action={formAction} className="space-y-3">
      <h2 className="text-lg font-semibold">Postularme a {equipoNombre}</h2>
      {rechazadaAntes && (
        <p className="text-xs text-muted">Tu postulación anterior fue rechazada. Podés volver a intentarlo.</p>
      )}
      <label className="block space-y-1">
        <span className="text-sm">Mensaje para el capitán (opcional)</span>
        <textarea
          name="mensaje"
          rows={3}
          maxLength={500}
          className={claseCampo}
          placeholder="Contá qué rol jugás, tu disponibilidad y por qué querés sumarte..."
        />
      </label>
      <p className="text-xs text-muted">El equipo va a ver tu perfil con tus stats verificadas.</p>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending}>
        {pending ? "Enviando..." : "Enviar postulación"}
      </Button>
    </Card>
  );
}
