// Kural tabanlı (LLM'siz) prompt-injection sezgisi. LLM'in kendi tespitine
// ek, ondan bağımsız ikinci bir sinyal. Yanlış pozitif verebilir; bu yüzden
// yalnızca uyarı üretir, metni silmez (görünür metin kullanıcının okuduğu metindir).

import { normalize } from './normalize.js';

const PATTERNS = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|prompts?|rules)/,
  /disregard (all |any )?(the )?(previous|prior|above) /,
  /(you are|act as|pretend to be) (now )?(an? )?(ai|assistant|language model|chatgpt|gemini|claude)/,
  /(system|developer) (prompt|message|instruction)/,
  /\b(ai|llm|language model|assistant|model)\b.{0,40}\b(must|should|shall)\b.{0,40}\b(report|say|output|respond|answer|return|rate|score)/,
  /(risk score|risk_score|score) (of |to |= ?|should be |must be )?0\b/,
  /(no|zero) (risky|risk) (clauses|items|terms)/,
  /onceki (tum )?(talimatlari|komutlari|kurallari) (yok say|unut|gormezden gel)/,
  /(yapay zeka|dil modeli|asistan|model)[^.]{0,50}(soylemeli|vermeli|yazmali|raporlamali|donmeli)/,
  /risk (skoru|puani)[^.]{0,20}(0|sifir)\b/,
  /(riskli madde|risk) (yok|bulunmamaktadir) (olarak|diye) (raporla|yaz|belirt)/,
  /\[(inst|system)\]|<\|?(im_start|system)\|?>/,
];

/** Türkçe karakterleri ASCII'ye indirerek tek bir desen kümesiyle iki dili de tarar. */
function fold(text) {
  return normalize(text)
    .replace(/[ç]/g, 'c').replace(/[ğ]/g, 'g').replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's').replace(/[ü]/g, 'u').replace(/[â]/g, 'a');
}

export function looksLikeInjection(text) {
  const t = fold(text);
  return PATTERNS.some((re) => re.test(t));
}

/** @returns {Array<{paragraph_id: string, quote: string, source: 'kural'}>} */
export function scanParagraphs(paragraphs) {
  return paragraphs
    .filter((p) => looksLikeInjection(p.text))
    .map((p) => ({ paragraph_id: p.id, quote: p.text.slice(0, 300), source: 'kural' }));
}
