// Prueba la key de Gemini sin imprimirla.
// Uso: node --env-file=.env.local scripts/check-gemini.mjs
const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim();

if (!key) { console.error("❌ Falta GEMINI_API_KEY en .env.local"); process.exit(1); }
if (!model) { console.error("❌ Falta GEMINI_MODEL en .env.local"); process.exit(1); }

console.log("Modelo:", model, "· largo de la key:", key.length, "· empieza con:", key.slice(0, 4) + "...");
if (/["'=\s]/.test(key)) console.warn("⚠️  La key tiene comillas, '=' o espacios: revisá la línea en .env.local");

console.log("Consultando a Gemini (máx. 20 s)...");
try {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Respondé solo con la palabra: funciona" }] }],
      }),
      signal: AbortSignal.timeout(20000),
    }
  );

  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }

  if (!res.ok) {
    console.error(`❌ Error HTTP ${res.status}:`, body.error?.message ?? body);
    process.exit(1);
  }
  const answer = body.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  if (!answer) {
    console.error("❌ Gemini respondió sin texto:", JSON.stringify(body).slice(0, 300));
    process.exit(1);
  }
  console.log("✅ Gemini respondió:", answer);
} catch (err) {
  if (err.name === "TimeoutError") console.error("❌ Gemini no respondió en 20 s (red, firewall o servicio lento).");
  else console.error("❌ Error de red:", err.message);
  process.exit(1);
}