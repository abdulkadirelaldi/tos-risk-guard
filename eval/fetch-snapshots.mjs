// Gerçek ToS sayfalarını indirip eklentiyle AYNI çıkarım koduyla paragraflara böler.
// Çıktı: eval/snapshots/<id>.json (eval girdisi) ve eval/snapshots/html/<id>.html (demo için).
// Eval'in tekrarlanabilir olması için anlık görüntüler repoya eklenir; siteler değişse de sonuç değişmez.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { extractBlocks, staticHiddenReason, pickRoot } from '../src/core/extract.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sources = JSON.parse(readFileSync(new URL('./sources.json', import.meta.url)));
const only = process.argv.slice(2);
const refetch = only.includes('--refetch');

for (const s of sources) {
  if (only.filter((x) => !x.startsWith('--')).length && !only.includes(s.id)) continue;
  const htmlPath = `eval/snapshots/html/${s.id}.html`;
  let html;
  if (existsSync(htmlPath) && !refetch) html = readFileSync(htmlPath, 'utf8');
  else {
    const res = await fetch(s.url, { headers: { 'user-agent': UA, 'accept-language': s.lang === 'tr' ? 'tr-TR,tr;q=0.9' : 'en-US,en;q=0.9' } });
    if (!res.ok) { console.error(`${s.id}: HTTP ${res.status}`); continue; }
    html = await res.text();
    writeFileSync(htmlPath, html);
  }
  const { document } = parseHTML(html);
  document.querySelectorAll('script,style,noscript,template,iframe').forEach((n) => n.remove());
  const { paragraphs, hidden } = extractBlocks(pickRoot(document), staticHiddenReason);
  const snapshot = {
    id: s.id, name: s.name, lang: s.lang, url: s.url,
    title: document.title?.trim() ?? '',
    fetchedAt: new Date().toISOString().slice(0, 10),
    paragraphs: paragraphs.map(({ id, text }) => ({ id, text })),
    hidden: hidden.map(({ text, reason }) => ({ text, reason })),
  };
  writeFileSync(`eval/snapshots/${s.id}.json`, JSON.stringify(snapshot, null, 1));
  const chars = paragraphs.reduce((n, p) => n + p.text.length, 0);
  console.log(`${s.id.padEnd(9)} ${String(paragraphs.length).padStart(4)} paragraf  ${String(chars).padStart(7)} karakter  gizli:${hidden.length}  | ${paragraphs.slice(0, 2).map((p) => p.text.slice(0, 45)).join(' || ')}`);
}
