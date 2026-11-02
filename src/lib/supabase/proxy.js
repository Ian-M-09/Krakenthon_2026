// Lógica de sesión que corre en el proxy (antes "middleware" en Next <16).
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Rutas que requieren estar logueado.
const RUTAS_PROTEGIDAS = ["/perfil", "/onboarding", "/equipos/nuevo"];
// Rutas a las que no tiene sentido entrar si ya hay sesión.
const RUTAS_AUTH = ["/login", "/registro"];

const coincide = (pathname, rutas) =>
  rutas.some((r) => pathname === r || pathname.startsWith(r + "/"));

// Redirige copiando las cookies de sesión que Supabase pudo haber refrescado.
function redirigir(request, pathname, response, params = {}) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida el token contra Supabase y lo refresca si venció.
  // No poner código entre createServerClient y getUser (lo pide la doc de @supabase/ssr).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && coincide(pathname, RUTAS_PROTEGIDAS)) {
    return redirigir(request, "/login", response, { next: pathname });
  }

  if (user && coincide(pathname, RUTAS_AUTH)) {
    return redirigir(request, "/", response);
  }

  // Onboarding obligatorio: sin fila en `perfiles` no se puede usar la app.
  const esApiOEstatico = pathname.startsWith("/api") || pathname.startsWith("/_next");
  if (user && !esApiOEstatico) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const enOnboarding = coincide(pathname, ["/onboarding"]);
    if (!perfil && !enOnboarding) return redirigir(request, "/onboarding", response);
    if (perfil && enOnboarding) return redirigir(request, "/", response);
  }

  return response;
}
