// Rapor paneli (eklenti kökenli iframe). Tüm içerik textContent ile basılır;
// LLM ya da sayfa kaynaklı hiçbir metin HTML olarak yorumlanmaz.

import { CATEGORIES } from '../core/categories.js';

const app = document.getElementById('app');
const SEV = { yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' };
const LEVEL = { yuksek: 'Yüksek risk', orta: 'Orta risk', dusuk: 'Düşük risk' };
const HIDDEN_REASON = {
  css_gizli: 'CSS ile gizlenmiş', aria_hidden: 'aria-hidden', sifir_boyut: 'sıfır boyutlu', ekran_disi: 'ekran dışına itilmiş',
  kucuk_yazi: 'okunamayacak kadar küçük yazı', kirpilmis: 'kırpılmış', renk_gizleme: 'arka planla aynı renk', page_agent_gorunmez: 'page-agent görünür DOM\'unda yok',
  hidden_ozelligi: 'hidden özniteliği',
};

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

const send = (msg) => chrome.runtime.sendMessage(msg);

function render(st) {
  app.replaceChildren();
  if (st.state === 'bos' || st.state === 'calisiyor') {
    app.append(h('p', {}, h('span', { class: 'spinner' }), 'Metin analiz ediliyor… (uzun metinlerde 20-40 sn sürebilir)'));
    return;
  }
  if (st.state === 'anahtar_yok') {
    app.append(h('div', { class: 'alert' }, 'Gemini API anahtarı tanımlı değil. Eklenti seçeneklerinden kendi anahtarınızı girin.'));
    return;
  }
  if (st.state === 'hata') {
    app.append(h('div', { class: 'alert' }, h('b', {}, 'Analiz tamamlanamadı. '), st.error || 'Bilinmeyen hata', h('p', {}, 'Sistem bu durumda tahmini bir rapor göstermez.')));
    return;
  }
  const r = st.report;
  const sections = [
    scoreSection(r),
    confidenceSection(r),
    injectionSection(r),
    r.summary ? h('section', {}, h('h2', {}, 'Özet'), h('p', {}, r.summary)) : null,
    clausesSection(r),
    rejectedSection(r),
    footer(r),
  ];
  app.append(...sections.filter(Boolean));
}

function scoreSection(r) {
  const color = { yuksek: 'var(--high)', orta: 'var(--mid)', dusuk: 'var(--low)' }[r.level];
  return h('section', { 'data-testid': 'score' },
    h('h2', {}, 'Risk skoru'),
    h('div', { class: 'score' },
      h('div', { class: `score-num lvl-${r.level}` }, String(r.score), h('small', {}, ' / 100')),
      h('div', {}, h('b', { class: `lvl-${r.level}` }, LEVEL[r.level]), h('div', { class: 'muted' }, 'Yalnızca alıntıyla doğrulanmış maddelerden, sabit ağırlıklarla hesaplanır.'))),
    h('div', { class: 'bar' }, (() => { const i = h('i'); i.style.width = `${r.score}%`; i.style.background = color; return i; })()),
    r.breakdown.length ? h('ul', { class: 'breakdown' }, r.breakdown.map((b) => h('li', {}, h('span', {}, `${b.label} (${b.count})`), h('span', {}, `+${b.points}`)))) : null,
  );
}

function confidenceSection(r) {
  const u = r.uncertainty;
  return h('section', { 'data-testid': 'confidence' },
    h('h2', {}, 'Sonuca güven'),
    h('div', { class: `conf ${u.level}` },
      h('b', {}, u.label),
      u.reasons.length ? h('ul', {}, u.reasons.map((x) => h('li', {}, x))) : h('span', { class: 'muted' }, 'Metnin tamamı analiz edildi ve tüm iddialar orijinal metinde doğrulandı.')));
}

function injectionSection(r) {
  const { hidden, visible } = r.injections;
  if (!hidden.length && !visible.length) return null;
  return h('section', { 'data-testid': 'injection' },
    h('h2', {}, 'Manipülasyon uyarısı'),
    h('div', { class: 'alert' },
      h('b', {}, 'Bu sayfada yapay zekaya yönelik talimatlar bulundu.'),
      ' Gizli olanlar analize hiç gönderilmedi; görünür olanlar veri olarak işlendi ve skor bunlardan etkilenmez.',
      hidden.map((x) => h('q', {}, `[gizli · ${HIDDEN_REASON[x.hiddenReason] ?? x.hiddenReason}] ${x.quote}`)),
      visible.map((x) => h('q', {}, `[görünür · ${x.paragraph_id} · tespit: ${x.source}] ${x.quote}`))));
}

function clausesSection(r) {
  const sec = h('section', { 'data-testid': 'clauses' }, h('h2', {}, `Riskli maddeler (${r.clauses.length})`));
  if (!r.clauses.length) sec.append(h('p', { class: 'muted' }, 'Doğrulanmış riskli madde yok. Bu, metnin risksiz olduğunu garanti etmez.'));
  for (const c of r.clauses) {
    sec.append(h('article', { class: 'clause', 'data-testid': 'clause' },
      h('div', { class: 'clause-head' },
        h('span', { class: 'clause-cat' }, CATEGORIES[c.category]?.label ?? c.category),
        h('span', { class: `sev lvl-${c.severity}` }, SEV[c.severity])),
      h('p', {}, c.explanation_tr),
      h('blockquote', {},
        `“${c.quote}”`,
        h('div', { class: 'src' },
          h('span', {}, `Orijinal metin · ${c.paragraph_id}${c.idCorrected ? ' (konum düzeltildi)' : ''}`),
          h('button', { type: 'button', onclick: () => send({ type: 'highlight', paragraphId: c.paragraph_id }) }, 'Sayfada göster →')))));
  }
  return sec;
}

function rejectedSection(r) {
  if (!r.rejected.length) return null;
  return h('section', { 'data-testid': 'rejected' },
    h('details', {},
      h('summary', {}, `Doğrulanamayan ${r.rejected.length} iddia gösterilmedi`),
      h('p', { class: 'muted' }, 'Model bu maddeleri önerdi ama alıntıları orijinal metinde bulunamadığı için geçersiz sayıldı ve skora katılmadı.'),
      h('ul', {}, r.rejected.map((x) => h('li', {}, h('b', {}, `${CATEGORIES[x.category]?.label ?? x.category}: `), x.reasonText, h('div', { class: 'muted' }, `Model alıntısı: “${x.quote.slice(0, 160)}”`))))));
}

function footer(r) {
  const m = r.meta;
  return h('p', { class: 'muted' },
    `Model: ${m.model} · ${m.sentParagraphs}/${m.totalParagraphs} paragraf · gizli blok: ${r.hiddenCount} · ${(m.ms / 1000).toFixed(1)} sn${r.fromCache ? ' · önbellekten' : ''}`);
}

document.getElementById('close').addEventListener('click', () => send({ type: 'closePanel' }));
document.getElementById('rerun').addEventListener('click', () => { render({ state: 'calisiyor' }); send({ type: 'rerun' }); });

let last = '';
async function poll() {
  const st = await send({ type: 'getState' });
  const key = JSON.stringify(st);
  if (key !== last) {
    last = key;
    render(st);
  }
  setTimeout(poll, st.state === 'tamam' || st.state === 'hata' ? 2000 : 700);
}
poll();
