// Lista los modelos de Gemini que tu key puede usar para generar texto.
// Uso: node --dns-result-order=ipv4first --env-file=.env.local scripts/list-gemini-models.mjs
const key = process.env.GEMINI_API_KEY?.trim();
if (!key) { console.error("❌ Falta GEMINI_API_KEY en .env.local"); process.exit(1); }

let pageToken = "";
const modelos = [];
do {
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("pageSize", "100");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json();
  if (!res.ok) { console.error(`❌ Error ${res.status}:`, body.error?.message); process.exit(1); }

  for (const m of body.models ?? []) {
    if (m.supportedGenerationMethods?.includes("generateContent")) {
      modelos.push(`${m.name.replace("models/", "")}  —  ${m.displayName}`);
    }
  }
  pageToken = body.nextPageToken ?? "";
} while (pageToken);

console.log("Modelos con generateContent disponibles:\n");
console.log(modelos.filter((m) => m.toLowerCase().includes("flash")).join("\n") || "(ninguno con 'flash')");
console.log(`\nTotal con generateContent: ${modelos.length}`);