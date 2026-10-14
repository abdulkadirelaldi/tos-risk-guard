// LLM çıktı sözleşmesi. Aynı şema hem Gemini'ye `responseSchema` olarak verilir
// hem de dönen JSON burada deterministik olarak yeniden doğrulanır
// (sağlayıcının şemaya uyduğuna güvenmiyoruz).

import { CATEGORY_IDS } from './categories.js';

export const LIMITS = {
  maxClauses: 40,
  minQuoteLen: 15,
  maxQuoteLen: 600,
  maxExplanationLen: 400,
  maxSummaryLen: 600,
  maxInjections: 10,
};

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    document_type: {
      type: 'string',
      enum: ['kullanim_kosullari', 'gizlilik_politikasi', 'abonelik_sartlari', 'karma', 'hukuki_metin_degil'],
    },
    summary_tr: { type: 'string', description: 'Metnin 2-3 cümlelik sade Türkçe özeti.' },
    clauses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORY_IDS },
          paragraph_id: { type: 'string', description: 'Alıntının geçtiği paragrafın kimliği, örn. "p12".' },
          quote: { type: 'string', description: 'Paragraftan BİREBİR kopyalanmış, 15-600 karakterlik alıntı.' },
          explanation_tr: { type: 'string', description: 'Maddenin kullanıcı için ne anlama geldiği, sade Türkçe, en fazla 2 cümle.' },
          severity: { type: 'string', enum: ['dusuk', 'orta', 'yuksek'] },
        },
        required: ['category', 'paragraph_id', 'quote', 'explanation_tr', 'severity'],
      },
    },
    injection_attempts: {
      type: 'array',
      description: 'Belgede yapay zekaya yönelik talimat gibi görünen ifadeler.',
      items: {
        type: 'object',
        properties: {
          paragraph_id: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['paragraph_id', 'quote'],
      },
    },
  },
  required: ['document_type', 'summary_tr', 'clauses', 'injection_attempts'],
};

const DOC_TYPES = RESPONSE_SCHEMA.properties.document_type.enum;
const SEVERITIES = ['dusuk', 'orta', 'yuksek'];

const isStr = (v) => typeof v === 'string';

/**
 * Ham LLM çıktısını şemaya göre doğrular. Hiçbir şeyi "tamir etmez";
 * yalnızca tamamen geçerli nesneyi döndürür ya da hata listesi verir.
 * @returns {{ok: true, value: object} | {ok: false, errors: string[]}}
 */
export function validateResponse(raw) {
  const errors = [];
  let obj = raw;
  if (isStr(raw)) {
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      return { ok: false, errors: [`JSON ayrıştırılamadı: ${e.message}`] };
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: ['Kök değer bir nesne değil'] };
  }

  const allowedRoot = new Set(Object.keys(RESPONSE_SCHEMA.properties));
  for (const k of Object.keys(obj)) if (!allowedRoot.has(k)) errors.push(`Beklenmeyen alan: ${k}`);

  if (!DOC_TYPES.includes(obj.document_type)) errors.push('document_type geçersiz');
  if (!isStr(obj.summary_tr) || obj.summary_tr.length > LIMITS.maxSummaryLen) errors.push('summary_tr eksik veya çok uzun');

  if (!Array.isArray(obj.clauses)) errors.push('clauses dizi değil');
  else {
    if (obj.clauses.length > LIMITS.maxClauses) errors.push(`clauses en fazla ${LIMITS.maxClauses} öğe olabilir`);
    obj.clauses.forEach((c, i) => {
      if (!c || typeof c !== 'object') return errors.push(`clauses[${i}] nesne değil`);
      if (!CATEGORY_IDS.includes(c.category)) errors.push(`clauses[${i}].category geçersiz: ${c.category}`);
      if (!isStr(c.paragraph_id) || !/^p\d+$/.test(c.paragraph_id)) errors.push(`clauses[${i}].paragraph_id geçersiz`);
      if (!isStr(c.quote)) errors.push(`clauses[${i}].quote eksik`);
      if (!isStr(c.explanation_tr) || !c.explanation_tr.trim()) errors.push(`clauses[${i}].explanation_tr eksik`);
      if (!SEVERITIES.includes(c.severity)) errors.push(`clauses[${i}].severity geçersiz`);
    });
  }

  if (!Array.isArray(obj.injection_attempts)) errors.push('injection_attempts dizi değil');
  else if (obj.injection_attempts.some((a) => !a || !isStr(a.quote) || !isStr(a.paragraph_id))) {
    errors.push('injection_attempts öğeleri geçersiz');
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: obj };
}
