// İçerik betiği: metni yakalar, gizli metni ayırır, paneli gösterir.
// LLM anahtarı burada YOK; LLM çağrısı background'da yapılır.
//
// page-agent (@page-agent/page-controller) burada yalnızca OKUMA amaçlı kullanılır:
// sayfanın "kullanıcının gördüğü" DOM metnini (dehydrated DOM) üretir. Bunu kendi
// görünürlük kontrolümüzle çapraz doğrularız. page-agent'ın tıklama/yazma/JS çalıştırma
// yetenekleri ve kendi LLM'i bilinçli olarak KULLANILMAZ (en az yetki ilkesi).

import { PageController } from '@page-agent/page-controller';
import { extractBlocks, looksLikeLegalPage, pickRoot } from '../core/extract.js';
import { normalize } from '../core/normalize.js';
import { browserHiddenReason } from '../core/visibility.js';

const HOST_ATTR = 'data-trg-host';
let paragraphEls = new Map();
let panelHost = null;
let running = false;

const squash = (t) => normalize(t).replace(/\s+/g, '');

/** page-agent'ın "görünür DOM" çıktısı. Hata olursa null döner ve yalnızca kendi kontrolümüz kullanılır. */
async function pageAgentVisibleText() {
  try {
    const pc = new PageController({ viewportExpansion: -1, highlightOpacity: 0, highlightLabelOpacity: 0 });
    const state = await pc.getBrowserState();
    await pc.cleanUpHighlights();
    pc.dispose();
    // page-agent etkileşimli öğeleri `[12]<a …>metin />` biçiminde işaretler ve metni düğüm
    // düğüm satırlara böler; işaretleri ve tüm boşlukları silerek yalnızca metni karşılaştırırız.
    return squash(state.content.replace(/\[\d+\]<[a-z0-9-]+[^>]*>/gi, ' ').replace(/\/>/g, ' '));
  } catch (e) {
    console.warn('[ToS Risk Guard] page-agent okunamadı:', e);
    return null;
  }
}

async function capture() {
  const root = pickRoot(document);
  const { paragraphs, hidden } = extractBlocks(root, browserHiddenReason);

  // Çapraz kontrol: kendi kontrolümüzün görünür dediği, ama page-agent'ın görünür
  // DOM'unda hiç geçmeyen paragrafları da karantinaya al.
  const agentText = await pageAgentVisibleText();
  let visible = paragraphs;
  if (agentText) {
    visible = [];
    for (const p of paragraphs) {
      const probe = squash(p.text).slice(0, 50);
      if (probe.length >= 20 && !agentText.includes(probe)) hidden.push({ text: p.text, reason: 'page_agent_gorunmez', el: p.el });
      else visible.push(p);
    }
  }
  visible = visible.map((p, i) => ({ ...p, id: `p${i + 1}` }));
  paragraphEls = new Map(visible.map((p) => [p.id, p.el]));

  const capturedChars = visible.reduce((s, p) => s + p.text.length, 0);
  const pageChars = (root.innerText || '').replace(/\s+/g, ' ').trim().length || 1;

  return {
    paragraphs: visible.map(({ id, text }) => ({ id, text })),
    hidden: hidden.map(({ text, reason }) => ({ text, reason })),
    meta: {
      url: location.href,
      title: document.title,
      extractionCoverage: Math.min(1, capturedChars / pageChars),
      pageAgentChecked: agentText ? 1 : 0,
    },
  };
}

function showPanel() {
  if (panelHost?.isConnected) {
    panelHost.style.display = 'block';
    return;
  }
  panelHost = document.createElement('div');
  panelHost.setAttribute(HOST_ATTR, '');
  // Panel, eklenti kökenli bir iframe'dir: sayfa betikleri içeriğini okuyamaz veya değiştiremez.
  const shadow = panelHost.attachShadow({ mode: 'closed' });
  const frame = document.createElement('iframe');
  frame.src = chrome.runtime.getURL('panel.html');
  frame.title = 'ToS Risk Guard raporu';
  frame.style.cssText = 'width:100%;height:100%;border:0;border-radius:12px;background:#fff;';
  shadow.appendChild(frame);
  panelHost.style.cssText = 'all:initial;position:fixed;top:12px;right:12px;width:420px;max-width:calc(100vw - 24px);height:calc(100vh - 24px);z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,.25);border-radius:12px;display:block;';
  document.documentElement.appendChild(panelHost);
}

async function run() {
  if (running) return;
  running = true;
  try {
    const cap = await capture();
    showPanel();
    e2eMark({ state: 'gonderildi' });
    await chrome.runtime.sendMessage({ type: 'analyze', capture: cap });
  } finally {
    running = false;
  }
}

function highlight(id) {
  const el = paragraphEls.get(id);
  if (!el) return;
  document.querySelectorAll('[data-trg-mark]').forEach((n) => {
    n.removeAttribute('data-trg-mark');
    n.style.outline = '';
    n.style.backgroundColor = '';
  });
  el.setAttribute('data-trg-mark', '');
  el.style.outline = '3px solid #f59e0b';
  el.style.backgroundColor = 'rgba(253, 230, 138, .6)';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Yalnızca e2e (Cypress) derlemesinde: sonuç durumunu DOM özniteliği olarak yaz ki test
 * beklemeyi bilsin. Normal derlemede sayfaya hiçbir sonuç bilgisi sızdırılmaz.
 */
function e2eMark({ state, score, confidence, firstClause }) {
  if (!__E2E__) return;
  const root = document.documentElement;
  root.setAttribute('data-trg-status', state);
  if (firstClause) root.setAttribute('data-trg-first-clause', firstClause);
  if (score != null) root.setAttribute('data-trg-score', String(score));
  if (confidence) root.setAttribute('data-trg-confidence', confidence);
}

chrome.runtime.onMessage.addListener((msg) => {
  const ownsPanel = Boolean(panelHost?.isConnected);
  if (msg.type === 'state' && ownsPanel) e2eMark(msg);
  if (msg.type === 'run' && window.top === window) run();
  else if (msg.type === 'highlight' && ownsPanel) highlight(msg.paragraphId);
  else if (msg.type === 'closePanel' && ownsPanel) panelHost.style.display = 'none';
  else if (msg.type === 'rerun' && ownsPanel) run();
});

// E2E: Cypress eklenti kökenli panel iframe'ine tıklayamaz; "Sayfada göster" düğmesinin
// yaptığı işi aynı fonksiyonla tetikler. Normal derlemede bu dinleyici yoktur.
if (__E2E__) document.addEventListener('trg-e2e-highlight', (e) => highlight(String(e.detail)));

// Hukuki metin gibi görünen sayfalarda otomatik çalış (dinamik içerik için kısa bekleme).
const headings = [...document.querySelectorAll('h1,h2')].slice(0, 5).map((h) => h.textContent).join(' ');
if (document.body && looksLikeLegalPage({ url: location.href, title: document.title, headings })) {
  setTimeout(run, 1200);
}
