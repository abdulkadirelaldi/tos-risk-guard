// Alıntı karşılaştırması için deterministik normalizasyon.
// Yalnızca biçimsel farkları (boşluk, tırnak tipi, tire, büyük/küçük harf) siler;
// kelime değişikliği eşleşmeyi bozar — bilinçli olarak bulanık eşleşme yok.

const QUOTES = /[‘’‚‛′`´]/g;
const DQUOTES = /[“”„‟″«»]/g;
const DASHES = /[‐-―−]/g;
const ZERO_WIDTH = /[​-‍⁠﻿­]/g;

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(QUOTES, "'")
    .replace(DQUOTES, '"')
    .replace(DASHES, '-')
    .replace(/…/g, '...')
    .toLocaleLowerCase('tr')
    // Türkçe locale "I" -> "ı" yapar; İngilizce metinlerde eşleşmeyi bozmaması için birleştir.
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kısa, deterministik içerik özeti (önbellek anahtarı için). FNV-1a 32-bit. */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
