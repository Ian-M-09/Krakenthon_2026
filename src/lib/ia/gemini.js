// Wrapper de Gemini: todo lo que habla con el LLM pasa por acá (docs/05-ia-gemini.md).
// Verificado contra @google/genai 3.0.0: generateContent con responseJsonSchema + abortSignal.
import "server-only";
import { GoogleGenAI, ApiError } from "@google/genai";
import { z } from "zod";

const TIMEOUT_MS = 20_000;

export class IAError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "IAError";
    this.code = code; // IA_NO_CONFIG | IA_TIMEOUT | IA_RATE_LIMITED | IA_INVALID | IA_UNAVAILABLE
  }
}

export const MENSAJES_IA = {
  IA_NO_CONFIG: "La IA no está configurada en este entorno. Avisale al admin.",
  IA_TIMEOUT: "La IA tardó demasiado en responder. Probá de nuevo en unos segundos.",
  IA_RATE_LIMITED: "La IA está recibiendo muchos pedidos. Probá de nuevo en un minuto.",
  IA_INVALID: "La IA devolvió una respuesta que no pudimos usar. Probá de nuevo.",
  IA_UNAVAILABLE: "La IA no está disponible en este momento. Probá de nuevo más tarde.",
};

let cliente = null;
function getCliente() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !process.env.GEMINI_MODEL?.trim()) throw new IAError("IA_NO_CONFIG");
  cliente ??= new GoogleGenAI({ apiKey });
  return cliente;
}

// GEMINI_MOCK=true → no se llama a Gemini: cada feature devuelve un ejemplo válido armado con su
// input. Sirve para desarrollar y ensayar la demo sin gastar la cuota del free tier.
export const esModoMock = () => process.env.GEMINI_MOCK === "true";

export const MODELO_MOCK = "mock";

// Orden de prueba: GEMINI_MODEL y después GEMINI_MODEL_FALLBACKS ("modelo-a,modelo-b"), sin repetidos.
export function modelosIA() {
  const lista = [process.env.GEMINI_MODEL, ...(process.env.GEMINI_MODEL_FALLBACKS ?? "").split(",")]
    .map((m) => m?.trim())
    .filter(Boolean);
  return [...new Set(lista)];
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ESPERA_REINTENTO_MS = 1000;

// 503 (saturado), 429 (cuota) y 404 (modelo no disponible) dependen del modelo: vale la pena
// reintentar y después probar con otro. 400/401/403 son de configuración y afectan a todos.
const esReintentable = (err) => err instanceof ApiError && [503, 429, 404].includes(err.status);

// zod → JSON Schema para `responseJsonSchema`: el mismo schema que valida la respuesta define
// lo que le pedimos al modelo (una sola fuente de verdad).
// Gemini solo acepta un subconjunto de JSON Schema: sacamos lo que no soporta ($schema, largos,
// patrones). Esos límites igual se validan con zod sobre la respuesta.
const NO_SOPORTADAS = new Set(["$schema", "minLength", "maxLength", "pattern"]);
function limpiar(nodo) {
  if (Array.isArray(nodo)) return nodo.map(limpiar);
  if (nodo && typeof nodo === "object") {
    return Object.fromEntries(
      Object.entries(nodo)
        .filter(([k]) => !NO_SOPORTADAS.has(k))
        .map(([k, v]) => [k, limpiar(v)])
    );
  }
  return nodo;
}
// Recorta un texto a `max` caracteres sin cortar palabras ("…" al final). No-string → igual.
export function recortar(texto, max) {
  if (typeof texto !== "string" || texto.length <= max) return texto;
  const corte = texto.slice(0, max - 1);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trimEnd()}…`;
}

const aJsonSchema = (zodSchema) => limpiar(z.toJSONSchema(zodSchema, { target: "draft-7" }));

// Convierte un error que no se reintenta en un IAError con mensaje amigable.
function errorFinal(err) {
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return new IAError("IA_TIMEOUT");
  if (err instanceof ApiError) {
    if ([400, 401, 403].includes(err.status)) return new IAError("IA_NO_CONFIG"); // key o request inválidos
    return new IAError("IA_UNAVAILABLE");
  }
  console.error("[ia] Error llamando a Gemini", err);
  return new IAError("IA_UNAVAILABLE");
}

/**
 * Pide a Gemini una respuesta JSON y la valida con zod.
 * Prueba GEMINI_MODEL y, ante 503/429/404, reintenta 1 vez (1 s) y pasa al siguiente fallback.
 * Devuelve { datos, modelo } (el modelo que respondió) o tira IAError con un código tipado.
 * `mock`: función que devuelve un ejemplo válido; se usa en lugar de Gemini si GEMINI_MOCK=true.
 * `preparar`: ajusta la respuesta antes de validarla (ej. recortar textos largos), para no tirar
 * un informe entero porque un campo se pasó de largo.
 */
export async function generateJSON({ system, prompt, schema, mock, preparar, temperature = 0.4, timeoutMs = TIMEOUT_MS }) {
  if (esModoMock()) {
    if (!mock) throw new Error("generateJSON: falta el `mock` para GEMINI_MOCK=true");
    // Se valida igual que una respuesta real: si el ejemplo se rompe, nos enteramos en desarrollo.
    const validado = schema.safeParse(await mock());
    if (!validado.success) {
      console.error("[ia] El mock no cumple el schema", validado.error.issues.slice(0, 3));
      throw new IAError("IA_INVALID");
    }
    return { datos: validado.data, modelo: MODELO_MOCK };
  }

  const ai = getCliente();
  const modelos = modelosIA();
  const jsonSchema = aJsonSchema(schema);

  let res = null;
  let modelo = null;
  let todos429 = true;
  for (const m of modelos) {
    for (let intento = 1; intento <= 2 && !res; intento++) {
      try {
        res = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
            temperature,
            abortSignal: AbortSignal.timeout(timeoutMs),
          },
        });
        modelo = m;
      } catch (err) {
        if (!esReintentable(err)) {
          if (err instanceof ApiError) console.error(`[ia] ${m} respondió ${err.status}: ${err.message}`);
          throw errorFinal(err);
        }
        if (err.status !== 429) todos429 = false;
        console.warn(`[ia] ${m} respondió ${err.status} (intento ${intento}/2)`);
        if (intento === 1) await dormir(ESPERA_REINTENTO_MS);
      }
    }
    if (res) break;
  }

  if (!res) {
    console.error(`[ia] Fallaron todos los modelos: ${modelos.join(", ")}`);
    throw new IAError(todos429 ? "IA_RATE_LIMITED" : "IA_UNAVAILABLE");
  }
  console.info(`[ia] Respondió ${modelo}`);

  let datos;
  try {
    datos = JSON.parse(res.text ?? "");
  } catch {
    console.error(`[ia] ${modelo} no devolvió JSON`);
    throw new IAError("IA_INVALID", "La respuesta no es JSON");
  }
  if (preparar) datos = preparar(datos);
  const validado = schema.safeParse(datos);
  if (!validado.success) {
    console.error(`[ia] Respuesta de ${modelo} fuera del schema`, validado.error.issues.slice(0, 3));
    throw new IAError("IA_INVALID");
  }
  return { datos: validado.data, modelo };
}
