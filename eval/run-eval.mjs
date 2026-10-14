// Mini eval: gerçek ToS anlık görüntüleri + bağımsız altın etiketler.
//
//   npm run eval                 -> önbellekteki model çıktılarını kullanır (yoksa Gemini'yi çağırır)
//   npm run eval -- --fresh      -> tüm model çıktılarını yeniden üretir
//   npm run eval -- --runs 3     -> her belgeyi 3 kez çalıştırıp skor kararlılığını ölçer
//
// Eşleşme kuralı (README'de açıklanır):
//   Doğrulanmış tahmin TP sayılır  <=> aynı kategoride bir altın öğe var ve tahminin paragrafı
//   o öğenin paragraflarından birine eşit veya ±1 komşu. Aynı öğeye ikinci eşleşme "tekrar"dır.
//   "borderline" altın öğeler iki yönde de puanlanmaz (eşleşirse "sınırda", kaçarsa sayılmaz).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { analyze } from '../src/core/pipeline.js';
import { createGeminiClient, DEFAULT_MODEL } from '../src/llm/gemini.js';
import { CATEGORIES } from '../src/core/categories.js';
import { runInjectionSuite } from './injection-suite.mjs';

const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const runs = Number(args[args.indexOf('--runs') + 1]) || 1;
const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
const apiKey = process.env.GEMINI_API_KEY;

const sources = JSON.parse(readFileSync('eval/sources.json', 'utf8'));
// Varsayılan model sonuçları eval/results/ altına, diğer modeller kendi alt klasörüne yazılır.
const isDefault = model === DEFAULT_MODEL;
const OUT = isDefault ? 'eval/results' : `eval/results/${model}`;
const RAW = `${OUT}/raw`;
mkdirSync(RAW, { recursive: true });

let client = null;
const llm = () => (client ??= createGeminiClient({ apiKey, model }));

async function predict(snap, run) {
  const path = `${RAW}/${snap.id}.run${run}.json`;
  if (!fresh && existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  if (!apiKey) throw new Error('GEMINI_API_KEY yok (.env). Önbellekte sonuç da yok: ' + path);
  process.stdout.write(`  ${snap.id} (çalıştırma ${run}) Gemini'ye gönderiliyor… `);
  const report = await analyze(
    { paragraphs: snap.paragraphs, hidden: snap.hidden, meta: { title: snap.title, url: snap.url, model, extractionCoverage: 1 } },
    llm(),
  );
  console.log(report.status, report.status === 'tamam' ? `skor=${report.score} madde=${report.clauses.length} red=${report.rejected.length}` : report.error);
  writeFileSync(path, JSON.stringify(report, null, 1));
  return report;
}

function near(pid, ids) {
  const n = Number(pid.slice(1));
  return ids.some((g) => Math.abs(Number(g.slice(1)) - n) <= 1);
}

function score(report, gold) {
  const items = gold.items.map((it, i) => ({ ...it, idx: i, hit: false }));
  const tp = [], fp = [], dup = [], borderlineHits = [];
  for (const c of report.clauses) {
    const match = items.find((it) => it.category === c.category && near(c.paragraph_id, it.paragraph_ids));
    if (!match) fp.push(c);
    else if (match.borderline) borderlineHits.push({ pred: c, gold: match });
    else if (match.hit) dup.push(c);
    else { match.hit = true; tp.push({ pred: c, gold: match }); }
  }
  const fn = items.filter((it) => !it.borderline && !it.hit);
  return { tp, fp, fn, dup, borderlineHits, goldCount: items.filter((i) => !i.borderline).length };
}

const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—');
const prf = (tp, fp, fn) => {
  const p = tp / (tp + fp), r = tp / (tp + fn);
  return { p, r, f1: (2 * p * r) / (p + r) };
};
const cut = (s, n = 180) => (s.length > n ? s.slice(0, n - 1) + '…' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const docs = [];
for (const src of sources) {
  const snap = JSON.parse(readFileSync(`eval/snapshots/${src.id}.json`, 'utf8'));
  const gold = JSON.parse(readFileSync(`eval/gold/${src.id}.json`, 'utf8'));
  const reports = [];
  for (let r = 1; r <= runs; r++) reports.push(await predict(snap, r));
  docs.push({ src, snap, gold, reports, result: reports[0].status === 'tamam' ? score(reports[0], gold) : null });
}

const injection = await runInjectionSuite({ llm, fresh, model, hasKey: Boolean(apiKey), rawDir: RAW })
  .catch((e) => ({ summary: null, markdown: `## Prompt injection testi\n\n_Bu model için çalıştırılamadı: ${e.message.slice(0, 160)}_` }));

// ---------- Rapor ----------
const L = [];
const total = { tp: 0, fp: 0, fn: 0, dup: 0, rej: 0, claims: 0 };
const perCat = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, { tp: 0, fp: 0, fn: 0 }]));

L.push('# Mini Eval Raporu', '');
L.push(`Model: \`${model}\` · Belge sayısı: ${docs.length} · Çalıştırma/belge: ${runs} · Tarih: ${new Date().toISOString().slice(0, 10)}`, '');
L.push('Bu dosya `npm run eval` tarafından otomatik üretilir. Yöntem için README\'deki "Eval" bölümüne bakın.', '');

L.push('## Özet', '', '| Belge | Dil | Paragraf | Altın (sınırda) | Yakalanan | Kaçırılan | Yanlış alarm | Precision | Recall | Doğrulanamayan iddia | Skor | Güven | Süre |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const d of docs) {
  const rep = d.reports[0];
  if (!d.result) { L.push(`| ${d.src.name} | ${d.src.lang} | ${d.snap.paragraphs.length} | — | — | — | — | — | — | — | HATA | — | — |`); continue; }
  const { tp, fp, fn, dup } = d.result;
  const m = prf(tp.length, fp.length, fn.length);
  const borderline = d.gold.items.filter((i) => i.borderline).length;
  total.tp += tp.length; total.fp += fp.length; total.fn += fn.length; total.dup += dup.length;
  total.rej += rep.rejected.length; total.claims += rep.rejected.length + rep.clauses.length;
  for (const x of tp) perCat[x.pred.category].tp++;
  for (const x of fp) perCat[x.category].fp++;
  for (const x of fn) perCat[x.category].fn++;
  L.push(`| ${d.src.name} | ${d.src.lang} | ${d.snap.paragraphs.length} | ${d.result.goldCount} (${borderline}) | ${tp.length} | ${fn.length} | ${fp.length} | ${pct(m.p)} | ${pct(m.r)} | ${rep.rejected.length} | ${rep.score} | ${rep.uncertainty.label} | ${(rep.meta.ms / 1000).toFixed(0)} sn |`);
}
const T = prf(total.tp, total.fp, total.fn);
L.push(`| **Toplam** | | | | **${total.tp}** | **${total.fn}** | **${total.fp}** | **${pct(T.p)}** | **${pct(T.r)}** | **${total.rej}/${total.claims}** | | | |`, '');
L.push(`- **Precision** ${pct(T.p)} · **Recall** ${pct(T.r)} · **F1** ${pct(T.f1)} (madde düzeyi, ±1 paragraf toleransı).`);
L.push(`- Model toplam ${total.claims} iddia üretti; **${total.rej} tanesi (${pct(total.rej / total.claims)}) alıntısı orijinal metinde bulunamadığı için doğrulayıcı tarafından atıldı** ve kullanıcıya gösterilmedi.`);
L.push(`- Aynı altın maddeye düşen ${total.dup} tekrar tahmin TP/FP olarak sayılmadı.`, '');

L.push('## Kategori bazında', '', '| Kategori | Yakalanan | Kaçırılan | Yanlış alarm | Precision | Recall |', '|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(perCat)) {
  if (!v.tp && !v.fp && !v.fn) continue;
  const m = prf(v.tp, v.fp, v.fn);
  L.push(`| ${CATEGORIES[k].label} | ${v.tp} | ${v.fn} | ${v.fp} | ${pct(m.p)} | ${pct(m.r)} |`);
}
L.push('');

if (runs > 1) {
  L.push('## Kararlılık (aynı girdi, tekrar çalıştırma)', '', '| Belge | Skorlar | Madde sayıları |', '|---|---|---|');
  for (const d of docs) L.push(`| ${d.src.name} | ${d.reports.map((r) => r.score ?? 'hata').join(' / ')} | ${d.reports.map((r) => r.clauses?.length ?? '-').join(' / ')} |`);
  L.push('', 'Skor formülü deterministiktir; çalıştırmalar arası fark yalnızca modelin hangi maddeleri önerdiğinden gelir.', '');
}

L.push(injection.markdown, '');

L.push('## Belge bazında ayrıntı', '');
for (const d of docs) {
  if (!d.result) continue;
  const { tp, fp, fn, borderlineHits } = d.result;
  const rep = d.reports[0];
  L.push(`### ${d.src.name}`, '', `Kaynak: ${d.src.url} (anlık görüntü: ${d.snap.fetchedAt})`, '');
  L.push('**Yakalanan**', '');
  for (const x of tp) L.push(`- ✅ \`${x.pred.category}\` ${x.pred.paragraph_id} — “${cut(x.pred.quote)}”`);
  if (!tp.length) L.push('- (yok)');
  L.push('', '**Kaçırılan**', '');
  for (const x of fn) L.push(`- ❌ \`${x.category}\` ${x.paragraph_ids.join(',')} — “${cut(x.evidence)}” _(${x.note})_`);
  if (!fn.length) L.push('- (yok)');
  L.push('', '**Yanlış alarm** (altın etikette karşılığı yok)', '');
  for (const x of fp) L.push(`- ⚠️ \`${x.category}\` ${x.paragraph_id} — “${cut(x.quote)}” → _${cut(x.explanation_tr, 140)}_`);
  if (!fp.length) L.push('- (yok)');
  if (borderlineHits.length) {
    L.push('', '**Sınırda (puanlanmadı)**', '');
    for (const x of borderlineHits) L.push(`- ◻️ \`${x.pred.category}\` ${x.pred.paragraph_id} — “${cut(x.pred.quote, 120)}”`);
  }
  if (rep.rejected.length) {
    L.push('', '**Doğrulayıcının attığı iddialar**', '');
    for (const x of rep.rejected) L.push(`- 🚫 \`${x.category}\` ${x.paragraph_id} — ${x.reasonText}: “${cut(x.quote, 140)}”`);
  }
  L.push('');
}

writeFileSync(`${OUT}/REPORT.md`, L.join('\n'));
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ model, runs, total: { ...total, precision: T.p, recall: T.r, f1: T.f1 }, injection: injection.summary }, null, 2));
console.log(`\nToplam: TP=${total.tp} FN=${total.fn} FP=${total.fp}  P=${pct(T.p)} R=${pct(T.r)} F1=${pct(T.f1)}  reddedilen=${total.rej}/${total.claims}`);
console.log(`Rapor: ${OUT}/REPORT.md`);
