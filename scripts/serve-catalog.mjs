import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(new URL('../MercurionWebNg/dist/mercurion-ui-catalog/browser/', import.meta.url))));
const port = Number(process.env.CATALOG_PORT ?? 4401);
const types = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${request.headers.host}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) {
    response.writeHead(400);
    response.end('Invalid path');
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const body = await readFile(join(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(body);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Mercurion UI catalog listening on http://127.0.0.1:${port}`);
});
