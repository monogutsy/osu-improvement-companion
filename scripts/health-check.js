#!/usr/bin/env node
import { request } from 'node:http';

const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:5173');
const BACKEND_URL = process.env.BACKEND_URL || (isProduction ? '' : 'http://localhost:4000');

const colors = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  cyan: '\u001b[36m',
  magenta: '\u001b[35m',
};
const tty = process.stdout.isTTY;
const paint = (c, s) => (tty ? `${colors[c]}${s}${colors.reset}` : String(s));

function probe({ name, url, path = '/', timeoutMs = 3000 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = request(
      {
        host: new URL(url).hostname,
        port: Number(new URL(url).port) || (url.startsWith('https') ? 443 : 80),
        method: 'GET',
        path,
        timeout: timeoutMs,
        headers: { Accept: 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const ms = Date.now() - started;
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body.slice(0, 200);
          }
          resolve({
            name,
            url: `${url}${path}`,
            ok: res.statusCode >= 200 && res.statusCode < 500,
            status: res.statusCode,
            ms,
            data: parsed,
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({
        name,
        url: `${url}${path}`,
        ok: false,
        status: 0,
        ms: Date.now() - started,
        data: err?.code ? `${err.code}: ${err.message}` : String(err),
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.end();
  });
}

function statusBadge(ok) {
  return ok ? paint('green', '✓ OK   ') : paint('red', '✗ FAIL ');
}

function printRow({ ok, name, url, status, ms, data }) {
  console.log(`  ${statusBadge(ok)} ${paint('bold', name)}`);
  console.log(`         ${paint('dim', url)}  ${paint('dim', `→ ${status || '—'} in ${ms}ms`)}`);
  if (data && typeof data === 'object') {
    const interesting = ['ok', 'service', 'configured', 'envLoaded', 'message', 'error'];
    const summary = interesting
      .filter((key) => data[key] !== undefined)
      .map((key) => `${key}=${JSON.stringify(data[key])}`)
      .join('  ');
    if (summary) console.log(`         ${paint('dim', summary)}`);
  } else if (typeof data === 'string' && data) {
    console.log(`         ${paint('dim', data)}`);
  }
  console.log('');
}

function printHint(probes) {
  const backend = probes.find((p) => p.name === 'Backend');
  const frontend = probes.find((p) => p.name === 'Frontend');
  if (!backend?.ok) {
    console.log(paint('yellow', 'Backend is not reachable. Try:'));
    console.log(paint('dim', '  - cd server && npm install'));
    console.log(paint('dim', '  - cp .env.example .env  (and fill in OSU_CLIENT_ID / OSU_CLIENT_SECRET)'));
    console.log(paint('dim', '  - node index.js   or   npm run dev:api'));
    console.log('');
  }
  if (!frontend?.ok) {
    console.log(paint('yellow', 'Frontend is not reachable. Try:'));
    console.log(paint('dim', '  - npm install'));
    console.log(paint('dim', '  - cp src/.env.example src/.env'));
    console.log(paint('dim', '  - npm run dev:web'));
    console.log('');
  }
}

async function main() {
  console.log('');
  console.log(paint('magenta', 'osu!Hub health check'));
  console.log(paint('dim', '─'.repeat(40)));
  console.log('');

  const probes = await Promise.all([
    probe({ name: 'Backend', url: BACKEND_URL, path: '/api/health' }),
    probe({ name: 'Backend (diagnostics)', url: BACKEND_URL, path: '/api/diagnostics' }),
    probe({ name: 'Frontend', url: FRONTEND_URL, path: '/' }),
  ]);

  probes.forEach(printRow);

  const allOk = probes.every((p) => p.ok);
  if (allOk) {
    console.log(paint('green', '✓ All services responding.'));
  } else {
    printHint(probes);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(paint('red', 'health check crashed:'), err);
  process.exit(2);
});