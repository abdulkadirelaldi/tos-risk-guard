// Uçtan uca analiz hattı. Tarayıcıdan (service worker) ve Node'dan (eval) aynı
// şekilde çağrılır; LLM, `callLLM(system, user, schema) -> string` fonksiyonu olarak enjekte edilir.

import { buildUserPrompt, SYSTEM_INSTRUCTION } from './prompt.js';
import { RESPONSE_SCHEMA, validateResponse } from './schema.js';
import { verifyClauses, verifyInjectionReports } from './verify.js';
import { scanParagraphs, looksLikeInjection } from './injection.js';
import { computeScore } from './score.js';
import { assessUncertainty } from './uncertainty.js';

export const DISCLAIMER = 'Bu uygulama hukuki tavsiye vermez. Rapor otomatik üretilmiştir ve hatalı ya da eksik olabilir; bağlayıcı olan sözleşmenin kendisidir.';

/**
 * @param {object} input
 * @param {Array<{id:string,text:string}>} input.paragraphs  görünür paragraflar
 * @param {Array<{text:string,reason:string}>} [input.hidden] gizli (karantina) bloklar
 * @param {{title?:string,url?:string,extractionCoverage?:number}} [input.meta]
 * @param {(system:string,user:string,schema:object)=>Promise<string>} callLLM
 */
export async function analyze({ paragraphs, hidden = [], meta = {} }, callLLM, opts = {}) {
  const started = Date.now();
  const prompt = buildUserPrompt(paragraphs, { maxChars: opts.maxChars, title: meta.title, url: meta.url });

  let parsed = null;
  let attempts = 0;
  let lastErrors = [];
  let userText = prompt.text;
  while (attempts < 2 && !parsed) {
    attempts++;
    const raw = await callLLM(SYSTEM_INSTRUCTION, userText, RESPONSE_SCHEMA);
    const v = validateResponse(raw);
    if (v.ok) parsed = v.value;
    else {
      lastErrors = v.errors;
      userText = `${prompt.text}\n\nÖnceki yanıtın şemaya uymadı: ${v.errors.slice(0, 5).join('; ')}. Yalnızca şemaya uygun JSON döndür.`;
    }
  }

  const hiddenInjections = hidden
    .filter((h) => looksLikeInjection(h.text))
    .map((h) => ({ quote: h.text.slice(0, 300), hiddenReason: h.reason, source: 'gizli_metin' }));

  if (!parsed) {
    return {
      status: 'hata',
      error: `Model çıktısı iki denemede de şemaya uymadı: ${lastErrors.slice(0, 3).join('; ')}`,
      disclaimer: DISCLAIMER,
      hiddenInjections,
      meta: { ...meta, attempts, ms: Date.now() - started },
    };
  }

  const { verified, rejected } = verifyClauses(parsed.clauses, prompt.sent, hidden);
  const scoring = computeScore(verified);

  const ruleInjections = scanParagraphs(prompt.sent);
  const llmInjections = verifyInjectionReports(parsed.injection_attempts, prompt.sent);
  const visibleInjections = mergeInjections(ruleInjections, llmInjections);

  const textById = new Map(prompt.sent.map((p) => [p.id, p.text]));
  const clauses = verified
    .map((c) => ({ ...c, paragraphText: textById.get(c.paragraph_id) ?? '' }))
    .sort((a, b) => sevRank(b.severity) - sevRank(a.severity));

  const uncertainty = assessUncertainty({
    documentType: parsed.document_type,
    verifiedCount: verified.length,
    rejectedCount: rejected.length,
    truncated: prompt.truncated,
    sentChars: prompt.sentChars,
    totalChars: prompt.totalChars,
    extractionCoverage: meta.extractionCoverage,
    hiddenCount: hidden.length,
    hiddenInjectionCount: hiddenInjections.length,
    visibleInjectionCount: visibleInjections.length,
    attempts,
    paragraphCount: paragraphs.length,
  });

  return {
    status: 'tamam',
    disclaimer: DISCLAIMER,
    documentType: parsed.document_type,
    summary: parsed.summary_tr,
    score: scoring.score,
    level: scoring.level,
    breakdown: scoring.breakdown,
    clauses,
    rejected: rejected.map(({ category, paragraph_id, quote, reason, reasonText }) => ({ category, paragraph_id, quote, reason, reasonText })),
    injections: { hidden: hiddenInjections, visible: visibleInjections },
    hiddenCount: hidden.length,
    uncertainty,
    meta: { ...meta, attempts, ms: Date.now() - started, sentParagraphs: prompt.sent.length, totalParagraphs: paragraphs.length },
  };
}

const sevRank = (s) => ({ yuksek: 3, orta: 2, dusuk: 1 })[s] ?? 0;

function mergeInjections(rule, llm) {
  const byPara = new Map();
  for (const r of [...rule, ...llm]) {
    const prev = byPara.get(r.paragraph_id);
    byPara.set(r.paragraph_id, prev ? { ...prev, source: 'kural+llm' } : r);
  }
  return [...byPara.values()];
}
