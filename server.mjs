import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ReviewError, validateInput } from './public/domain.mjs';
import { createBackboard, liveConfiguration, checkBackboardAccess } from './lib/backboard.mjs';

const root = new URL('./public/', import.meta.url);
const files = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/styles.css', ['styles.css', 'text/css; charset=utf-8']], ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']], ['/domain.mjs', ['domain.mjs', 'text/javascript; charset=utf-8']]]);
const positive = (value, fallback, max) => /^\d+$/.test(String(value)) && Number(value) > 0 ? Math.min(Number(value), max) : fallback;
export function createApp({ env = process.env, analyze = createBackboard({ env }) } = {}) {
  let attempts = 0, active = 0;
  const clients = new Map();
  const maxCalls = positive(env.MAX_LIVE_CALLS, 20, 100);
  const maxPerIp = positive(env.MAX_CALLS_PER_IP_HOUR, 3, 10);
  const maxConcurrent = positive(env.MAX_CONCURRENT, 1, 2);
  const server = http.createServer(async (req, res) => {
    const security = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store'
    };
    const send = (status, body, type = 'application/json; charset=utf-8') => { if (!res.headersSent) { res.writeHead(status, { ...security, 'Content-Type': type }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); } };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/healthz') return send(200, { status: 'ok', liveConfigured: liveConfiguration(env) });
      if (req.method === 'GET' && path === '/api/status') return send(200, { liveConfigured: liveConfiguration(env), model: liveConfiguration(env) ? env.BACKBOARD_MODEL : null, remainingCalls: Math.max(0, maxCalls - attempts), limitNote: 'Process-local limits reset on restart and are not account spending caps.' });
      if (req.method === 'GET' && files.has(path)) { const [name, type] = files.get(path); return send(200, await readFile(new URL(name, root)), type); }
      if (path !== '/api/analyze') return send(404, { error: 'Not found.' });
      if (req.method !== 'POST') return send(405, { error: 'Use POST for analysis.' });
      if (req.headers.origin) {
        let origin;
        try { origin = new URL(req.headers.origin); } catch { throw new ReviewError('Invalid request origin.', 403); }
        if (origin.host !== req.headers.host || !['http:', 'https:'].includes(origin.protocol)) throw new ReviewError('Cross-origin requests are not allowed.', 403);
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new ReviewError('Cross-site requests are not allowed.', 403);
      if (!req.headers['content-type']?.startsWith('application/json')) throw new ReviewError('Send JSON input.', 415);
      if (Number(req.headers['content-length']) > 20000) throw new ReviewError('Input is too large.', 413);
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 20000) throw new ReviewError('Input is too large.', 413); chunks.push(chunk); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new ReviewError('Input must be valid JSON.'); }
      const input = validateInput(body);
      if (!liveConfiguration(env)) throw new ReviewError('Live analysis is not configured yet. Explore the labelled sample instead.', 503);
      const now = Date.now();
      for (const [key, item] of clients) if (now - item.start >= 3600000) clients.delete(key);
      // Socket address is deliberately used: never trust an arbitrary X-Forwarded-For header.
      // Behind Render this can group visitors under one proxy IP (safe but restrictive).
      const ip = req.socket.remoteAddress;
      const client = clients.get(ip) || { start: now, count: 0 };
      if (clients.size >= 1000 && !clients.has(ip)) throw new ReviewError('The demo is busy. Please try later.', 429);
      if (attempts >= maxCalls || client.count >= maxPerIp) { res.setHeader('Retry-After', '3600'); throw new ReviewError('The live demo usage limit has been reached. Explore the sample or try later.', 429); }
      if (active >= maxConcurrent) { res.setHeader('Retry-After', '30'); throw new ReviewError('Another review is running. Please try again shortly.', 429); }
      client.count++; clients.set(ip, client); attempts++; active++;
      try { send(200, await analyze(input)); } finally { active--; }
    } catch (error) {
      send(error instanceof ReviewError ? error.status : 500, { error: error instanceof ReviewError ? error.message : 'Unexpected server error. Please try later.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '0.0.0.0', async () => {
    console.log(`ScopeProof listening on port ${port}; live analysis ${liveConfiguration() ? 'configured' : 'disabled'}.`);
    if (liveConfiguration()) {
      const access = await checkBackboardAccess();
      console.log(access.checked ? `Backboard access check: HTTP ${access.httpStatus}.` : `Backboard access check: ${access.reason}.`);
    }
  });
}
