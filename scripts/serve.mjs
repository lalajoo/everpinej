import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.writeHead(302, { Location: '/penuri/' }); return res.end(); }
    if (url.pathname === '/penuri') { res.writeHead(302, { Location: '/penuri/' + url.search }); return res.end(); }
    if (!url.pathname.startsWith('/penuri/')) throw new Error('404');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== path.join(root, 'penuri') && !file.startsWith(path.join(root, 'penuri') + path.sep)) throw new Error('404');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': /-[a-f0-9]{12}\.json$/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + (process.env.PORT || 4173) + '/penuri/'));
