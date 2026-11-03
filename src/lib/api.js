// Forma estándar de las respuestas de los route handlers (docs/02-arquitectura.md):
// { ok: true, data } o { ok: false, error: { code, message } }
import { NextResponse } from "next/server";
import { RiotError, MENSAJES_RIOT } from "@/lib/riot/client";

export const ok = (data, status = 200) => NextResponse.json({ ok: true, data }, { status });

export const fail = (code, message, status = 400) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

// Convierte cualquier excepción en una respuesta amigable (la UI nunca ve un stack trace).
export function failDesde(err) {
  if (err instanceof RiotError) {
    const status = { NOT_FOUND: 404, RATE_LIMITED: 429 }[err.code] ?? 503;
    return fail(err.code, MENSAJES_RIOT[err.code], status);
  }
  console.error(err);
  return fail("INTERNAL", "Ocurrió un error inesperado. Probá de nuevo en unos segundos.", 500);
}
