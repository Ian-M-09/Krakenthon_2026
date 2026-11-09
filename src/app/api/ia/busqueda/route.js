// POST { texto } → filtros interpretados por la IA + la query string para /jugadores.
// Pide sesión para que la cuota de Gemini no la pueda gastar cualquiera desde afuera.
import { ok, fail, failDesde } from "@/lib/api";
import { getUsuario } from "@/lib/auth";
import { interpretarBusqueda, TEXTO_MAX } from "@/lib/ia/busqueda";
import { IAError, MENSAJES_IA } from "@/lib/ia/gemini";
import { filtrosDesdeIA, aQueryString } from "@/lib/busqueda";

export async function POST(request) {
  const user = await getUsuario();
  if (!user) return fail("UNAUTHORIZED", "Iniciá sesión para buscar con lenguaje natural.", 401);

  const body = await request.json().catch(() => ({}));
  const texto = String(body.texto ?? "").trim();
  if (!texto) return fail("BAD_REQUEST", "Escribí qué jugador estás buscando.");
  if (texto.length > TEXTO_MAX) return fail("BAD_REQUEST", `Máximo ${TEXTO_MAX} caracteres.`);

  try {
    const { filtros, cacheado } = await interpretarBusqueda(texto);
    // tz = zona horaria del navegador del reclutador: la franja "noche" es SU noche.
    const query = aQueryString(filtrosDesdeIA(filtros, { equipo: body.equipo, tz: body.tz, texto }));
    return ok({ filtros, query, cacheado, no_entendido: filtros.texto_libre_no_entendido || null });
  } catch (err) {
    if (err instanceof IAError) {
      // La búsqueda manual sigue andando: la UI muestra este aviso y deja los filtros.
      return fail(err.code, `${MENSAJES_IA[err.code]} Mientras tanto podés usar los filtros.`, 503);
    }
    return failDesde(err);
  }
}
