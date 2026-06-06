import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENV_PATH = join(__dirname, '.env');

const isProduction = process.env.NODE_ENV === 'production';

const colors = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
};

function paint(color, text) {
  if (!process.stdout.isTTY) return String(text);
  return `${colors[color]}${text}${colors.reset}`;
}

function log(line = '') {
  process.stdout.write(`${line}\n`);
}

function header(text) {
  const bar = '─'.repeat(Math.max(0, 60 - text.length - 2));
  log('');
  log(`${paint('magenta', '┌─')} ${paint('bold', text)} ${paint('dim', bar)}`);
}

function ok(label, value = '✓') {
  log(`  ${paint('green', '✓')} ${label}${value ? paint('dim', `  ${value}`) : ''}`);
}

function warn(label, hint) {
  log(`  ${paint('yellow', '!')} ${label}`);
  if (hint) log(`      ${paint('dim', hint)}`);
}

function fail(label, hint) {
  log(`  ${paint('red', '✗')} ${label}`);
  if (hint) log(`      ${paint('dim', hint)}`);
}

function info(label, value) {
  log(`  ${paint('cyan', '•')} ${label} ${paint('dim', value)}`);
}

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    if (isProduction) {
      log('');
      log(`${paint('dim', 'ℹ')}  No server/.env file (expected in production - env vars come from the Render dashboard).`);
    } else {
      log('');
      log(`${paint('yellow', '⚠')}  No ${paint('bold', 'server/.env')} file found.`);
      log(`   ${paint('dim', 'Copy ')}${paint('bold', 'server/.env.example')}${paint('dim', ' to ')}${paint('bold', 'server/.env')}${paint('dim', ' and fill in your osu! OAuth credentials.')}`);
    }
    log('');
    return { loaded: false, path: ENV_PATH };
  }

  const result = dotenv.config({ path: ENV_PATH });
  if (result.error) {
    fail(`Failed to read ${ENV_PATH}`, result.error.message);
    return { loaded: false, path: ENV_PATH };
  }
  return { loaded: true, path: ENV_PATH, parsed: result.parsed };
}

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLikelyLocalOrigin(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(value);
}

function parseOriginList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function validateConfig() {
  const env = loadEnv();

  const errors = [];
  const warnings = [];

  const rawClientId = process.env.OSU_CLIENT_ID?.trim() ?? '';
  const rawClientSecret = process.env.OSU_CLIENT_SECRET?.trim() ?? '';
  const rawFrontendOrigin = process.env.FRONTEND_ORIGIN?.trim() ?? '';
  const rawRedirectUri = process.env.OSU_REDIRECT_URI?.trim() ?? '';
  const rawPort = process.env.PORT?.trim() ?? '';

  const clientIdLooksValid = /^\d+$/.test(rawClientId);
  const clientSecretLooksValid = rawClientSecret.length >= 20;

  const allowedOrigins = parseOriginList(rawFrontendOrigin);
  const frontendOrigin = allowedOrigins[0] || 'http://localhost:5173';
  const redirectUri =
    rawRedirectUri ||
    `${(allowedOrigins[0] || frontendOrigin).replace(/\/$/, '')}/auth/callback`;

  const port = readNumber(rawPort, 4000);

  if (!rawClientId) {
    errors.push({
      field: 'OSU_CLIENT_ID',
      message: 'Missing OSU_CLIENT_ID. Get one at https://osu.ppy.sh/home/account/edit#new-oauth-application',
    });
  } else if (!clientIdLooksValid) {
    errors.push({
      field: 'OSU_CLIENT_ID',
      message: `OSU_CLIENT_ID should be a numeric id (got "${rawClientId.slice(0, 4)}...").`,
    });
  }

  if (!rawClientSecret) {
    errors.push({
      field: 'OSU_CLIENT_SECRET',
      message: 'Missing OSU_CLIENT_SECRET. NEVER commit this file - it stays in server/.env only.',
    });
  } else if (!clientSecretLooksValid) {
    warnings.push({
      field: 'OSU_CLIENT_SECRET',
      message: `OSU_CLIENT_SECRET looks unusually short (${rawClientSecret.length} chars). Double-check it was copied fully.`,
    });
  }

  if (rawFrontendOrigin) {
    for (const origin of allowedOrigins) {
      if (!isValidUrl(origin)) {
        errors.push({
          field: 'FRONTEND_ORIGIN',
          message: `FRONTEND_ORIGIN contains an invalid URL: "${origin}". Expected a full URL or a comma-separated list of URLs.`,
        });
      }
    }
  } else {
    if (isProduction) {
      errors.push({
        field: 'FRONTEND_ORIGIN',
        message:
          'FRONTEND_ORIGIN is required in production. Set it to your Vercel URL (e.g. https://osu-hub.vercel.app).',
      });
    } else {
      warnings.push({
        field: 'FRONTEND_ORIGIN',
        message:
          'FRONTEND_ORIGIN is not set; defaulting to http://localhost:5173. Set it before deploying.',
      });
    }
  }

  if (isProduction && allowedOrigins.some(isLikelyLocalOrigin)) {
    errors.push({
      field: 'FRONTEND_ORIGIN',
      message: `FRONTEND_ORIGIN contains a localhost address, which is invalid in production: "${rawFrontendOrigin}"`,
    });
  }

  if (rawRedirectUri && !isValidUrl(rawRedirectUri)) {
    errors.push({
      field: 'OSU_REDIRECT_URI',
      message: `OSU_REDIRECT_URI must be a full URL (got "${rawRedirectUri}").`,
    });
  }

  if (isProduction && rawRedirectUri && isLikelyLocalOrigin(rawRedirectUri)) {
    errors.push({
      field: 'OSU_REDIRECT_URI',
      message: `OSU_REDIRECT_URI looks like a localhost address, which is invalid in production.`,
    });
  }

  if (rawPort && !Number.isFinite(Number(rawPort))) {
    errors.push({
      field: 'PORT',
      message: `PORT must be a number (got "${rawPort}").`,
    });
  }

  if (
    rawClientSecret &&
    /your|placeholder|replace|example|xxxx/i.test(rawClientSecret)
  ) {
    errors.push({
      field: 'OSU_CLIENT_SECRET',
      message: 'OSU_CLIENT_SECRET still looks like a placeholder value. Paste the real one from your osu! OAuth app.',
    });
  }

  const trustProxy = process.env.TRUST_PROXY === 'true' || isProduction;

  const config = Object.freeze({
    clientId: rawClientId,
    clientSecret: rawClientSecret,
    frontendOrigin,
    allowedOrigins: allowedOrigins.length ? allowedOrigins : [frontendOrigin],
    redirectUri,
    port,
    scopes: 'identify public',
    envLoaded: env.loaded,
    isProduction,
    trustProxy,
    isConfigured: errors.length === 0,
  });

  return { config, errors, warnings };
}

export function printStartupBanner({ config, errors, warnings }) {
  const okToLogin = config.isConfigured;

  header('osu!Hub auth server');
  if (config.isProduction) {
    ok('Environment', 'production');
  } else if (config.envLoaded) {
    ok('Loaded environment from', paint('dim', 'server/.env'));
  } else {
    warn('No server/.env file found', 'Login will fail until you copy server/.env.example to server/.env and fill it in.');
  }
  info('Allowed origins', config.allowedOrigins.join(', '));
  info('Redirect URI', config.redirectUri);
  info('Port', String(config.port));
  info('Scopes', config.scopes);
  info('Trust proxy', String(config.trustProxy));

  log('');
  if (okToLogin) {
    ok(
      paint('green', 'OAuth configured.'),
      `${config.clientId.slice(0, 4)}…  (secret ${'*'.repeat(Math.min(config.clientSecret.length, 32))})`
    );
  } else {
    fail('OAuth is NOT configured.', 'Login will return 500 until the missing variables are set.');
  }

  if (warnings.length) {
    log('');
    header('Warnings');
    warnings.forEach((w) => warn(w.field, w.message));
  }

  if (errors.length) {
    log('');
    header('Configuration errors');
    errors.forEach((e) => fail(e.field, e.message));
  }

  log('');
  log(paint('dim', `  Starting on port ${config.port}`));
  log('');
}

export async function probeOsuApi(timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://osu.ppy.sh/api/v2/me', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    return {
      ok: response.status === 401 || response.ok,
      status: response.status,
      message:
        response.status === 401
          ? 'Reachable (401 expected without auth)'
          : `Reachable (status ${response.status})`,
    };
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      message: isAbort ? `Timed out after ${timeoutMs}ms` : error?.message ?? 'Unknown error',
    };
  } finally {
    clearTimeout(timer);
  }
}