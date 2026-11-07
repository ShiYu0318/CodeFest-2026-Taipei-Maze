// SPDX-License-Identifier: AGPL-3.0-or-later
import http from 'node:http';
import { readFile } from 'node:fs/promises';

const routes = new Map([
  ['/', ['text/html; charset=utf-8', new URL('../integration/townpass/smoke/index.html', import.meta.url)]],
  ['/bridge.js', ['text/javascript; charset=utf-8', new URL('../integration/townpass/smoke/bridge.js', import.meta.url)]],
]);

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
  if (path === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok', service: 'townpass-local-smoke' }));
    return;
  }
  const route = routes.get(path);
  if (!route) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(route[1]);
    response.writeHead(200, { 'Content-Type': route[0] });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(500).end('Local smoke asset unavailable');
  }
});

server.on('error', (error) => {
  console.error(`Local smoke server failed: ${error.code ?? 'unknown error'}`);
  process.exitCode = 1;
});
server.listen(8765, '127.0.0.1', () => {
  console.log('TownPass local smoke page: http://127.0.0.1:8765/');
  console.log('Loopback only. This is a diagnostic page, not the Taipei Maze product.');
});
