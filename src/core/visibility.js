// Gerçek tarayıcıda (layout bilgisiyle) görünürlük kontrolü. İçerik betiği ve Cypress
// enjeksiyon testi aynı fonksiyonu kullanır.

/** Gerçek tarayıcı görünürlük kontrolü: CSS gizleme, sıfır boyut, ekran dışı, minik yazı, renk gizleme. */
export function browserHiddenReason(el) {
  // Öğenin kendi penceresini kullan (Cypress'te test kodu başka bir iframe'de çalışır).
  const win = el.ownerDocument.defaultView;
  if (el.closest('[aria-hidden="true"]')) return 'aria_hidden';
  if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return 'css_gizli';
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return 'sifir_boyut';
  const absTop = rect.top + win.scrollY;
  if (rect.right < 0 || rect.left > el.ownerDocument.documentElement.scrollWidth || absTop + rect.height < 0) return 'ekran_disi';
  const style = win.getComputedStyle(el);
  if (parseFloat(style.fontSize) < 5) return 'kucuk_yazi';
  if (/rect\(0(px)?,?\s*0(px)?/.test(style.clip) || style.clipPath === 'inset(100%)' || style.clipPath === 'inset(50%)') return 'kirpilmis';
  if (sameColorAsBackground(el, style, win)) return 'renk_gizleme';
  return null;
}

function parseRgb(c) {
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
}

function sameColorAsBackground(el, style, win) {
  const fg = parseRgb(style.color);
  if (!fg || fg.a === 0) return Boolean(fg);
  let bg = null;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = parseRgb(win.getComputedStyle(n).backgroundColor);
    if (c && c.a > 0.5) { bg = c; break; }
  }
  bg ??= { r: 255, g: 255, b: 255 };
  return Math.abs(fg.r - bg.r) + Math.abs(fg.g - bg.g) + Math.abs(fg.b - bg.b) < 20;
}
