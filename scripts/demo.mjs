// Demo videosunu kaydeder: e2e derlemesi + yerel sunucu + Chrome for Testing (headed) + Cypress.
// Google Chrome 137+ `--load-extension` desteklemediği ve Cypress headless modda eklenti
// yüklemediği için Chrome for Testing ve --headed kullanılır.
import { spawn, execSync } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

function findCft() {
  const base = '.browsers/chrome';
  if (!existsSync(base)) execSync('npx -y @puppeteer/browsers install chrome@stable --path .browsers', { stdio: 'inherit' });
  for (const dir of readdirSync(base)) {
    const mac = join(base, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    const macx64 = join(base, dir, 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    const linux = join(base, dir, 'chrome-linux64/chrome');
    for (const p of [mac, macx64, linux]) if (existsSync(p)) return join(process.cwd(), p);
  }
  throw new Error('Chrome for Testing bulunamadı');
}

const spec = process.argv[2] || 'cypress/e2e/demo.cy.js';
// Yakalama testi LLM çağırmaz; yalnızca demo anahtarlı e2e derlemesine ihtiyaç duyar.
execSync(spec.includes('demo') ? 'node build.mjs --e2e' : 'node build.mjs', { stdio: 'inherit' });
const server = spawn('node', ['scripts/serve.mjs'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 800));
try {
  execSync(`npx cypress run --headed --browser "${findCft()}" --spec ${spec}`, { stdio: 'inherit' });
} finally {
  server.kill();
  execSync('node build.mjs'); // anahtarlı e2e derlemesini dist/'te bırakma
}
const video = `cypress/videos/${spec.split('/').pop()}.mp4`;
if (existsSync(video)) {
  mkdirSync('demo', { recursive: true });
  copyFileSync(video, 'demo/demo.mp4');
  console.log('Video: demo/demo.mp4');
}
