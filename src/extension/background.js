// Service worker: API anahtarının yaşadığı ve LLM'in çağrıldığı TEK yer.
// Sayfa (ve sayfada çalışan page-agent) anahtara hiçbir zaman erişemez.

import { analyze } from '../core/pipeline.js';
import { hash } from '../core/normalize.js';
import { createGeminiClient, DEFAULT_MODEL } from '../llm/gemini.js';

const PANEL_URL = chrome.runtime.getURL('panel.html');
const CACHE_TTL_MS = 30 * 60 * 1000;

/** tabId -> { state: 'calisiyor'|'tamam'|'hata'|'anahtar_yok', report?, error? } */
const tabState = new Map();

async function getConfig() {
  const { apiKey, model } = await chrome.storage.local.get(['apiKey', 'model']);
  if (apiKey) return { apiKey, model: model || DEFAULT_MODEL };
  // Yalnızca `npm run build -- --e2e` ile üretilen yerel test derlemesinde bulunur (dist/ git'e girmez).
  try {
    const res = await fetch(chrome.runtime.getURL('e2e-config.json'));
    if (res.ok) {
      const cfg = await res.json();
      return { apiKey: cfg.apiKey, model: cfg.model || DEFAULT_MODEL };
    }
  } catch {}
  return { apiKey: null, model: DEFAULT_MODEL };
}

async function runAnalysis(tabId, capture) {
  await runAnalysisInner(tabId, capture);
  const st = tabState.get(tabId);
  chrome.tabs.sendMessage(tabId, {
    type: 'state',
    state: st?.state,
    score: st?.report?.score,
    confidence: st?.report?.uncertainty?.level,
    firstClause: st?.report?.clauses?.[0]?.paragraph_id,
  }).catch(() => {});
}

async function runAnalysisInner(tabId, capture) {
  const { apiKey, model } = await getConfig();
  if (!apiKey) {
    tabState.set(tabId, { state: 'anahtar_yok' });
    return;
  }
  const cacheKey = `rapor:${model}:${hash(capture.paragraphs.map((p) => p.text).join('\n') + '|' + capture.hidden.map((h) => h.text).join('\n'))}`;
  const cached = (await chrome.storage.session.get(cacheKey))[cacheKey];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    tabState.set(tabId, { state: 'tamam', report: { ...cached.report, fromCache: true } });
    return;
  }

  tabState.set(tabId, { state: 'calisiyor' });
  try {
    const report = await analyze(
      { paragraphs: capture.paragraphs, hidden: capture.hidden, meta: { ...capture.meta, model } },
      createGeminiClient({ apiKey, model }),
    );
    tabState.set(tabId, { state: report.status === 'tamam' ? 'tamam' : 'hata', report, error: report.error });
    if (report.status === 'tamam') await chrome.storage.session.set({ [cacheKey]: { at: Date.now(), report } });
  } catch (e) {
    tabState.set(tabId, { state: 'hata', error: String(e.message || e) });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.tab) return false;
  const tabId = sender.tab.id;
  const fromPanel = typeof sender.url === 'string' && sender.url.startsWith(PANEL_URL);

  switch (msg?.type) {
    case 'analyze': {
      if (fromPanel) return false;
      // Bilerek await edilmiyor: içerik betiği durumu panel üzerinden takip eder.
      runAnalysis(tabId, sanitizeCapture(msg.capture));
      sendResponse({ ok: true });
      return false;
    }
    case 'getState': {
      if (!fromPanel) return false;
      sendResponse(tabState.get(tabId) ?? { state: 'bos' });
      return false;
    }
    case 'highlight':
    case 'closePanel':
    case 'rerun': {
      if (!fromPanel) return false;
      if (msg.type === 'rerun') tabState.delete(tabId);
      // Panel bir iframe'dir; mesaj tüm çerçevelere gider, yalnızca paneli açan içerik betiği işler.
      chrome.tabs.sendMessage(tabId, { type: msg.type, paragraphId: String(msg.paragraphId ?? '') }).catch(() => {});
      sendResponse({ ok: true });
      return false;
    }
    default:
      return false;
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'run', force: true }, { frameId: 0 }).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => tabState.delete(tabId));

/** İçerik betiğinden gelen veriyi tip ve boyut açısından sınırla (güvenilmeyen girdi). */
function sanitizeCapture(c = {}) {
  const str = (v, max) => String(v ?? '').slice(0, max);
  const paragraphs = (Array.isArray(c.paragraphs) ? c.paragraphs : []).slice(0, 5000)
    .map((p, i) => ({ id: `p${i + 1}`, text: str(p.text, 5000) }));
  const hidden = (Array.isArray(c.hidden) ? c.hidden : []).slice(0, 500)
    .map((h) => ({ text: str(h.text, 2000), reason: str(h.reason, 40) }));
  const m = c.meta ?? {};
  return {
    paragraphs,
    hidden,
    meta: {
      url: str(m.url, 500),
      title: str(m.title, 300),
      extractionCoverage: Number.isFinite(m.extractionCoverage) ? m.extractionCoverage : undefined,
      pageAgentChecked: Number(m.pageAgentChecked) || 0,
    },
  };
}
