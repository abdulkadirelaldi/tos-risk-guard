// DOM -> paragraf listesi. Hem tarayıcıda (gerçek görünürlük kontrolüyle) hem de
// Node'da (linkedom ile, eval anlık görüntüleri için) aynı kod kullanılır.
// Görünürlük kararı dışarıdan verilen `hiddenReason(el)` fonksiyonuna bırakılır.

const BLOCK_SEL = 'p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,blockquote,pre,summary,caption,figcaption';
const SKIP_SEL = 'script,style,noscript,template,svg,nav,button,select,textarea,[data-trg-host]';
const LOOSE_TEXT_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'SPAN', 'FONT', 'CENTER', 'BODY']);
const MIN_LOOSE = 40;

const clean = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * @param {Element} root  genelde document.body
 * @param {(el: Element) => string|null} hiddenReason  gizliyse sebep, değilse null
 * @returns {{paragraphs: Array<{id,text,el}>, hidden: Array<{text,reason,el}>}}
 */
export function extractBlocks(root, hiddenReason = () => null) {
  const all = [...root.querySelectorAll(BLOCK_SEL)].filter((el) => !el.closest(SKIP_SEL));
  // En içteki blokları al: <li><p>..</p></li> içinde yalnızca <p> sayılır.
  const leaves = all.filter((el) => !el.querySelector(BLOCK_SEL));
  const leafSet = new Set(leaves);

  // Blok etiketine sarılmamış "çıplak" metinler (div içinde düz metin yazan siteler için).
  // İç içe blokların (ör. alt listesi olan <li>) kendi doğrudan metni de kaybolmasın.
  const ownText = (el) => clean([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
  const loose = [];
  for (const el of root.querySelectorAll('*')) {
    if (!LOOSE_TEXT_TAGS.has(el.tagName) || el.closest(SKIP_SEL)) continue;
    if (el.closest(BLOCK_SEL)) continue;
    const own = ownText(el);
    if (own.length >= MIN_LOOSE) loose.push({ el, text: own });
  }
  for (const el of all) {
    if (leafSet.has(el)) continue;
    const own = ownText(el);
    if (own.length >= MIN_LOOSE) loose.push({ el, text: own });
  }

  const ordered = [
    ...leaves.map((el) => ({ el, text: clean(el.textContent || '') })),
    ...loose,
  ].filter((b) => b.text.length > 1);

  // Belge sırasına diz.
  ordered.sort((a, b) => (a.el === b.el ? 0 : a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1));

  const paragraphs = [];
  const hidden = [];
  let prev = '';
  for (const b of ordered) {
    if (b.text === prev) continue;
    prev = b.text;
    const reason = hiddenReason(b.el);
    if (reason) hidden.push({ text: b.text, reason, el: b.el });
    else paragraphs.push({ id: `p${paragraphs.length + 1}`, text: b.text, el: b.el });
  }
  return { paragraphs, hidden };
}

/** Linkedom/statik HTML için: yalnızca layout gerektirmeyen gizleme işaretleri. */
export function staticHiddenReason(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hasAttribute('hidden')) return 'hidden_ozelligi';
    if (n.getAttribute('aria-hidden') === 'true') return 'aria_hidden';
    const style = (n.getAttribute('style') || '').replace(/\s+/g, '').toLowerCase();
    if (/display:none|visibility:hidden|opacity:0(?![.\d])/.test(style)) return 'css_gizli';
    if (/font-size:0(px)?[;]?|font-size:0\./.test(style)) return 'kucuk_yazi';
  }
  return null;
}

/** Sayfanın hukuki metin gibi görünüp görünmediğine dair ucuz sezgi (otomatik tetikleme için). */
const URL_HINT = /(terms|tos|legal|privacy|policy|policies|conditions|agreement|eula|subscription|kosul|kullanim|gizlilik|sozlesme|aydinlatma|kvkk|uyelik|abonelik|sartlar)/i;
const TEXT_HINT = /(terms of (service|use)|privacy (policy|notice)|user agreement|kullanım koşulları|gizlilik politikası|üyelik sözleşmesi|abonelik (şartları|sözleşmesi)|aydınlatma metni|hizmet şartları)/i;

export function looksLikeLegalPage({ url = '', title = '', headings = '' }) {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {}
  return URL_HINT.test(path) || TEXT_HINT.test(title) || TEXT_HINT.test(headings);
}

/**
 * Ana içerik kökünü seçer: <main>/<article>/[role=main] sayfa metninin büyük kısmını
 * içeriyorsa onu, yoksa body'yi kullanır (menü/çerez bandı gürültüsünü azaltır).
 */
export function pickRoot(document) {
  const body = document.body;
  const bodyLen = (body.textContent || '').length || 1;
  const candidates = [...document.querySelectorAll('main,[role="main"],article')];
  let best = null;
  for (const c of candidates) {
    const len = (c.textContent || '').length;
    if (len / bodyLen >= 0.4 && (!best || len > (best.textContent || '').length)) best = c;
  }
  return best ?? body;
}
