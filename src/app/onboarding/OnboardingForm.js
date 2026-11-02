"use client";

import { useActionState } from "react";
import { completarOnboarding } from "./actions";

const OPCIONES = [
  { valor: "busco_equipo", titulo: "Busco equipo", texto: "Soy jugador y quiero que me encuentren." },
  { valor: "busco_jugadores", titulo: "Busco jugadores", texto: "Armo o recluto para un equipo." },
];

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(completarOnboarding, null);

  return (
    <form action={formAction} className="w-full max-w-lg space-y-6 rounded-lg bg-surface p-6">
      <h1 className="text-2xl font-bold">Terminá tu perfil</h1>

      <label className="block space-y-1">
        <span className="text-sm">Nombre de usuario</span>
        <input
          name="nombre_usuario"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]{3,20}"
          defaultValue={state?.nombre_usuario ?? ""}
          className="w-full rounded border border-border bg-background px-3 py-2"
        />
        <span className="text-xs text-muted">
          3 a 20 caracteres: letras, números o _. Va en la URL de tu perfil.
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm">¿Venís a buscar equipo o jugadores?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPCIONES.map((op, i) => (
            <label
              key={op.valor}
              className="cursor-pointer rounded-lg border border-border p-4 has-[:checked]:border-accent"
            >
              <input
                type="radio"
                name="intencion"
                value={op.valor}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span className="block font-semibold">{op.titulo}</span>
              <span className="block text-sm text-muted">{op.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-accent px-4 py-2 font-semibold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
