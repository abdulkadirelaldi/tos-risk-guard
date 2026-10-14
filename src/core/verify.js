// Alıntı doğrulama: "alıntısı olmayan iddia geçersizdir" kuralının uygulandığı yer.
// Her madde, analize gönderilen görünür paragraflarda birebir (normalize edilmiş) bulunmak zorunda.

import { normalize } from './normalize.js';
import { LIMITS } from './schema.js';

export const REJECT_REASONS = {
  alinti_bulunamadi: 'Alıntı orijinal metinde bulunamadı',
  gizli_metinden_alinti: 'Alıntı sayfadaki gizli metinden geliyor',
  alinti_cok_kisa: 'Alıntı çok kısa (anlamlı kanıt değil)',
  alinti_cok_uzun: 'Alıntı çok uzun',
  aciklamada_link_veya_kod: 'Açıklamada link/HTML var (olası enjeksiyon)',
  aciklama_cok_uzun: 'Açıklama çok uzun',
  tekrar: 'Aynı paragraf ve kategori için tekrar',
};

const LINK_OR_CODE = /(https?:\/\/|www\.|<\s*\/?\s*[a-z]+[^>]*>|javascript:)/i;

/**
 * Alıntıyı "..." ile bölünmüş parçalar halinde, sırayla, aynı paragrafta arar.
 * @returns {boolean}
 */
function containsQuote(normPara, normQuote) {
  const parts = normQuote.split(/\s*\.\.\.\s*/).map((p) => p.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
  if (!parts.length) return false;
  let from = 0;
  for (const part of parts) {
    const at = normPara.indexOf(part, from);
    if (at === -1) return false;
    from = at + part.length;
  }
  return true;
}

/**
 * @param {Array<{id: string, text: string}>} paragraphs  LLM'e gönderilen görünür paragraflar
 * @param {Array<{text: string}>} hiddenBlocks            karantinaya alınmış gizli metin
 */
export function makeLocator(paragraphs, hiddenBlocks = []) {
  const normParas = paragraphs.map((p) => ({ id: p.id, norm: normalize(p.text) }));
  const byId = new Map(normParas.map((p) => [p.id, p.norm]));
  const normHidden = hiddenBlocks.map((b) => normalize(b.text));

  return function locate(paragraphId, quote) {
    const q = normalize(quote);
    const own = byId.get(paragraphId);
    if (own && containsQuote(own, q)) return { found: true, paragraphId };
    const other = normParas.find((p) => containsQuote(p.norm, q));
    if (other) return { found: true, paragraphId: other.id, idCorrected: true };
    if (normHidden.some((h) => containsQuote(h, q))) return { found: false, reason: 'gizli_metinden_alinti' };
    return { found: false, reason: 'alinti_bulunamadi' };
  };
}

/**
 * Doğrulanmış ve reddedilmiş maddeleri ayırır. Reddedilenler kullanıcıya
 * "doğrulanamayan iddia" olarak sayıyla gösterilir, içerikleri madde olarak sunulmaz.
 */
export function verifyClauses(clauses, paragraphs, hiddenBlocks = []) {
  const locate = makeLocator(paragraphs, hiddenBlocks);
  const verified = [];
  const rejected = [];
  const seen = new Set();

  for (const c of clauses) {
    const quoteLen = normalize(c.quote).length;
    let reason = null;
    let loc = null;

    if (quoteLen < LIMITS.minQuoteLen) reason = 'alinti_cok_kisa';
    else if (quoteLen > LIMITS.maxQuoteLen) reason = 'alinti_cok_uzun';
    else if (LINK_OR_CODE.test(c.explanation_tr)) reason = 'aciklamada_link_veya_kod';
    else if (c.explanation_tr.length > LIMITS.maxExplanationLen) reason = 'aciklama_cok_uzun';
    else {
      loc = locate(c.paragraph_id, c.quote);
      if (!loc.found) reason = loc.reason;
    }

    if (!reason) {
      const key = `${c.category}|${loc.paragraphId}`;
      if (seen.has(key)) reason = 'tekrar';
      else seen.add(key);
    }

    if (reason) rejected.push({ ...c, reason, reasonText: REJECT_REASONS[reason] });
    else verified.push({ ...c, paragraph_id: loc.paragraphId, idCorrected: Boolean(loc.idCorrected) });
  }
  return { verified, rejected };
}

/** LLM'in raporladığı enjeksiyon denemeleri de ancak alıntı doğrulanırsa kabul edilir. */
export function verifyInjectionReports(reports, paragraphs) {
  const locate = makeLocator(paragraphs);
  return reports
    .map((r) => ({ ...r, loc: locate(r.paragraph_id, r.quote) }))
    .filter((r) => r.loc.found && normalize(r.quote).length >= 10)
    .map((r) => ({ paragraph_id: r.loc.paragraphId, quote: r.quote, source: 'llm' }));
}
