// Demo ve e2e testleri için küçük statik sunucu.
//   /fixtures/*            -> test sayfaları (enjeksiyon, belirsizlik)
//   /legal/<id>/terms      -> eval/snapshots/html/<id>.html (gerçek ToS anlık görüntüleri)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize as norm } from 'node:path';

const PORT = Number(process.env.PORT) || 4173;
const root = process.cwd();

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = null;
  const legal = url.pathname.match(/^\/legal\/([a-z0-9-]+)\/terms$/);
  if (legal) file = join(root, 'eval/snapshots/html', `${legal[1]}.html`);
  else if (url.pathname.startsWith('/fixtures/')) file = join(root, norm(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file || !file.startsWith(root)) return res.writeHead(404).end('not found');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
