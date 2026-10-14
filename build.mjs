// dist/ klasörüne yüklenebilir eklentiyi üretir.
//   node build.mjs          -> normal derleme
//   node build.mjs --e2e    -> Cypress için: .env'deki anahtarı dist/e2e-config.json'a yazar
//                              ve sonuç durumunu DOM özniteliği olarak işaretler. Asla dağıtılmaz.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const e2e = process.argv.includes('--e2e');
const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const getEnv = (k) => process.env[k] || env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() || '';
if (e2e && !getEnv('GEMINI_API_KEY')) throw new Error('E2E derlemesi için .env içinde GEMINI_API_KEY gerekli');
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');

await build({
  entryPoints: {
    background: 'src/extension/background.js',
    content: 'src/extension/content.js',
    options: 'src/extension/options.js',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  define: {
    __E2E__: JSON.stringify(e2e),
    // Anahtar YALNIZCA yerel e2e derlemesine gömülür; dist/ git'e girmez ve demo bitince normal derleme yazılır.
    __E2E_KEY__: JSON.stringify(e2e ? getEnv('GEMINI_API_KEY') : ''),
    __E2E_MODEL__: JSON.stringify(e2e ? getEnv('GEMINI_MODEL') : ''),
  },
  loader: { '.css': 'text' },
  logLevel: 'warning',
});

cpSync('manifest.json', 'dist/manifest.json');
for (const f of ['options.html']) cpSync(`src/extension/${f}`, `dist/${f}`);

if (e2e) {
  const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
  manifest.name += ' (E2E)';
  writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
}
console.log(`dist/ hazır${e2e ? ' (e2e)' : ''}`);
