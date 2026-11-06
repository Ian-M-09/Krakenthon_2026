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
    const query = aQueryString(filtrosDesdeIA(filtros, body.equipo));
    return ok({ filtros, query, cacheado });
  } catch (err) {
    if (err instanceof IAError) {
      // La búsqueda manual sigue andando: la UI muestra este aviso y deja los filtros.
      return fail(err.code, `${MENSAJES_IA[err.code]} Mientras tanto podés usar los filtros.`, 503);
    }
    return failDesde(err);
  }
}
