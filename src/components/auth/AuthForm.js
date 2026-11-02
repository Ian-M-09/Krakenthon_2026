"use client";

import Link from "next/link";
import { useActionState } from "react";

const inputClass = "w-full rounded border border-border bg-background px-3 py-2";

// Formulario compartido por /login y /registro.
export default function AuthForm({ action, modo, next }) {
  const [state, formAction, pending] = useActionState(action, null);
  const esRegistro = modo === "registro";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg bg-surface p-6">
        <h1 className="text-2xl font-bold">{esRegistro ? "Crear cuenta" : "Iniciar sesión"}</h1>

        {next && <input type="hidden" name="next" value={next} />}

        <label className="block space-y-1">
          <span className="text-sm">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.email ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={esRegistro ? "new-password" : "current-password"}
            className={inputClass}
          />
        </label>

        {esRegistro && (
          <label className="block space-y-1">
            <span className="text-sm">Repetí la contraseña</span>
            <input
              name="confirmar"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
        )}

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
          {pending ? "Un momento..." : esRegistro ? "Registrarme" : "Entrar"}
        </button>

        <p className="text-center text-sm text-muted">
          {esRegistro ? "¿Ya tenés cuenta? " : "¿No tenés cuenta? "}
          <Link href={esRegistro ? "/login" : "/registro"} className="text-accent">
            {esRegistro ? "Iniciá sesión" : "Registrate"}
          </Link>
        </p>
      </form>
    </main>
  );
}
