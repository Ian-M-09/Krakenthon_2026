"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Solo aceptamos rutas internas en ?next= para evitar redirecciones a otros sitios.
function destinoSeguro(next) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/";
}

// Traduce los errores de Supabase Auth a mensajes amigables.
function traducirError(error) {
  const msg = error?.message ?? "";
  if (msg.includes("Invalid login credentials")) return "Email o contraseña incorrectos.";
  if (msg.includes("already registered")) return "Ya existe una cuenta con ese email.";
  if (msg.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("valid email") || msg.includes("invalid format")) return "El email no es válido.";
  if (error?.status === 429) return "Demasiados intentos. Esperá un momento y probá de nuevo.";
  return "No pudimos completar la operación. Probá de nuevo en unos segundos.";
}

export async function login(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completá email y contraseña.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traducirError(error), email };

  // Si no tiene perfil todavía, el proxy lo manda a /onboarding.
  redirect(destinoSeguro(formData.get("next")));
}

export async function registro(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (!email || !password) return { error: "Completá email y contraseña.", email };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres.", email };
  if (password !== confirmar) return { error: "Las contraseñas no coinciden.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: traducirError(error), email };

  // Con la confirmación de email desactivada, signUp ya devuelve la sesión.
  if (!data.session) {
    return { error: "Cuenta creada. Iniciá sesión para continuar.", email };
  }
  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
