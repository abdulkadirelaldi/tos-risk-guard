// Gemini REST istemcisi (bağımlılıksız). Service worker'da ve Node 18+'da çalışır.
// Yapılandırılmış çıktı: responseMimeType=application/json + responseSchema, temperature=0.

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function createGeminiClient({ apiKey, model = DEFAULT_MODEL, fetchImpl = globalThis.fetch, maxRetries = 3, timeoutMs = 120_000 }) {
  if (!apiKey) throw new Error('Gemini API anahtarı tanımlı değil');

  return async function callLLM(system, user, schema) {
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    };

    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      }).catch((e) => {
        if (e.name === 'TimeoutError') return { status: 504, ok: false, text: async () => `İstemci zaman aşımı (${timeoutMs / 1000} sn)` };
        throw e;
      });
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`Gemini HTTP ${res.status}: ${msg.slice(0, 300)}`);
      }
      const data = await res.json();
      const cand = data.candidates?.[0];
      const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text) throw new Error(`Gemini boş yanıt döndü (finishReason: ${cand?.finishReason ?? data.promptFeedback?.blockReason ?? '?'})`);
      return text;
    }
  };
}
